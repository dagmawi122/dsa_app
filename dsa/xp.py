"""DSA problem XP service.

This module is the ONLY place that decides whether XP is awarded.

Data model
----------
* ``XP``            one row per user, ``value`` = running total (already existing).
* ``DSA XP Award``  one row per (user, problem) = auditable history. Its primary
                    key (``name``) is ``"<user>::<problem>"``, so the database itself
                    refuses a second award for the same user and problem.

Flow
----
Accepted submission -> ``settle_submission_xp`` -> ``award_problem_xp`` (idempotent)
-> API response (``xp`` dict) -> Vue UI.
"""

from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, get_datetime, now_datetime

SOLUTION_UNLOCK_DOCTYPE = "DSA Solution Unlock"


def solution_unlocked_before(user: str, problem: str, when) -> bool:
	"""True if the user opened the official solution before `when`."""
	unlocked_at = frappe.db.get_value(
		SOLUTION_UNLOCK_DOCTYPE, {"unlock_key": award_key(user, problem)}, "unlocked_at"
	)
	return bool(unlocked_at and when and get_datetime(unlocked_at) < get_datetime(when))

XP_DOCTYPE = "XP"
AWARD_DOCTYPE = "DSA XP Award"
SAVEPOINT = "dsa_xp_award"

# Used ONLY when a problem has no ``xp_reward`` set. Change the numbers here
# and nowhere else.
FALLBACK_XP_BY_DIFFICULTY = {"easy": 10, "medium": 20, "hard": 40}


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------


def award_key(user: str, problem: str) -> str:
	return f"{user}::{problem}"


def get_problem_xp(problem: str) -> int:
	"""XP a problem is worth: its own ``xp_reward``, else the difficulty fallback."""
	row = frappe.db.get_value("DSAProblem", problem, ["xp_reward", "difficulty"], as_dict=True)
	if not row:
		return 0
	reward = cint(row.xp_reward)
	if reward > 0:
		return reward
	return FALLBACK_XP_BY_DIFFICULTY.get((row.difficulty or "").strip().lower(), 0)


def get_total_xp(user: str) -> int:
	return cint(frappe.db.get_value(XP_DOCTYPE, {"user": user}, "value") or 0)

@frappe.whitelist()
def get_my_xp() -> int:
	return get_total_xp(frappe.session.user)

def _add_to_total(user: str, amount: int) -> None:
	"""Atomically add ``amount`` to the user's XP row (created if missing)."""
	name = frappe.db.get_value(XP_DOCTYPE, {"user": user}, "name")
	if not name:
		doc = frappe.get_doc({"doctype": XP_DOCTYPE, "user": user, "value": 0})
		doc.insert(ignore_permissions=True)
		name = doc.name
	frappe.db.sql(
		f"UPDATE `tab{XP_DOCTYPE}` SET `value` = COALESCE(`value`, 0) + %s WHERE `name` = %s",
		(cint(amount), name),
	)


def xp_payload(awarded=False, gained=0, total=0, already_awarded=False, error=None, solution_first=False):
	return {
		"awarded": bool(awarded),
		"gained": cint(gained),
		"total": cint(total),
		"already_awarded": bool(already_awarded),
		"solution_first": bool(solution_first),
		"error": error,
	}




def award_problem_xp(user: str, problem: str, submission: str) -> dict[str, Any]:
	"""Award XP once per (user, problem). Safe to call any number of times.

	Verifies against the database that ``submission`` belongs to ``user`` and
	``problem`` and is genuinely ``Accepted``. Raises on unexpected failures
	(the caller logs them); a duplicate is NOT an error.
	"""
	row = frappe.db.get_value(
		"DSA Submission",
		submission,
		["member", "problem", "status", "creation"],
		as_dict=True,
	)
	if not row:
		frappe.throw(f"DSA Submission {submission} not found.", frappe.DoesNotExistError)
	if row.member != user or row.problem != problem:
		frappe.throw("Submission does not belong to this user/problem.", frappe.PermissionError)

	result = {
		"success": True,
		"xp_awarded": False,
		"xp_gained": 0,
		"total_xp": get_total_xp(user),
		"already_awarded": False,
		"solution_first": False,
		"award": None,
	}

	if row.status != "Accepted":
		return result

	amount = get_problem_xp(problem)
	if amount <= 0:
		return result

	key = award_key(user, problem)

	def _existing():
		return frappe.db.get_value(AWARD_DOCTYPE, key, ["name", "submission", "xp"], as_dict=True)

	existing = _existing()
	if existing:
		result.update(already_awarded=True, award=existing)
		return result

	# Solution opened BEFORE this accepted submission -> no problem XP.
	if solution_unlocked_before(user, problem, row.creation):
		result["solution_first"] = True
		return result

	frappe.db.savepoint(SAVEPOINT)
	try:
		# Serialise concurrent awards for the same user.
		frappe.db.get_value("User", user, "name", for_update=True)

		frappe.get_doc(
			{
				"doctype": AWARD_DOCTYPE,
				"award_key": key,
				"user": user,
				"problem": problem,
				"submission": submission,
				"xp": amount,
				"reason": "First accepted solution",
				"awarded_at": now_datetime(),
				"notified": 0,
			}
		).insert(ignore_permissions=True)

		_add_to_total(user, amount)
	except (frappe.DuplicateEntryError, frappe.UniqueValidationError):
		# Another request won the race: the DB unique key did its job.
		frappe.db.rollback(save_point=SAVEPOINT)
		result.update(already_awarded=True, award=_existing(), total_xp=get_total_xp(user))
		return result
	except Exception:
		frappe.db.rollback(save_point=SAVEPOINT)
		raise

	frappe.db.commit()

	result.update(
		xp_awarded=True,
		xp_gained=amount,
		total_xp=get_total_xp(user),
		award=_existing(),
	)
	return result


def _claim_notification(award_name: str) -> bool:
	"""True for exactly ONE caller: the first to report this award to the browser."""
	if frappe.db.get_value(AWARD_DOCTYPE, award_name, "notified", for_update=True):
		return False
	frappe.db.set_value(AWARD_DOCTYPE, award_name, "notified", 1, update_modified=False)
	frappe.db.commit()
	return True


# ---------------------------------------------------------------------
# Used by the submission flow
# ---------------------------------------------------------------------


def settle_submission_xp(submission, report: bool = False) -> dict[str, Any]:
	"""Award (idempotently) and describe XP for a DSA Submission document.

	``report=True`` is passed only by the browser-facing endpoint. The background
	worker passes ``False`` so it can award XP without "using up" the one-time
	``awarded=True`` notification the browser is waiting for.

	Never raises: an XP failure is logged and returned in ``error`` so the
	Judge0 verdict is never affected.
	"""
	total = 0
	try:
		total = get_total_xp(submission.member)

		if submission.status != "Accepted":
			return xp_payload(total=total)

		# Contest scoring is separate; contest attempts do not grant practice XP.
		if frappe.db.exists("Contest Submission", {"dsa_submission": submission.name}):
			return xp_payload(total=total)

		result = award_problem_xp(submission.member, submission.problem, submission.name)
		total = result["total_xp"]
		award = result["award"]

		if not award:  # problem is worth 0 XP
			return xp_payload(total=total)

		if award.submission != submission.name:
			# XP for this problem came from an earlier submission.
			return xp_payload(total=total, already_awarded=True)

		# This submission earned the XP.
		if not report:
			return xp_payload(total=total)

		if _claim_notification(award.name):
			return xp_payload(awarded=True, gained=award.xp, total=total)

		return xp_payload(total=total, already_awarded=True)

	except Exception:
		frappe.log_error(
			title="DSA XP award failed",
			message=(
				f"submission={submission.name} user={submission.member} "
				f"problem={submission.problem}\n\n{frappe.get_traceback()}"
			),
		)
		return xp_payload(
			total=total,
			error="XP could not be recorded. The submission result is unaffected; see Error Log.",
		)

def deduct_xp(user: str, amount: int) -> dict[str, Any]:
	"""Atomically deduct XP from a user's balance."""
	amount = cint(amount)

	if amount <= 0:
		return {
			"deducted": 0,
			"remaining": get_total_xp(user),
		}

	name = frappe.db.get_value(
		XP_DOCTYPE,
		{"user": user},
		"name",
	)

	if not name:
		frappe.throw(
			_(
				"You don't have enough XP to open this solution. "
				"You need {0} XP, but you only have 0 XP."
			).format(amount)
		)

	row = frappe.db.sql(
		f"""
		SELECT `name`, COALESCE(`value`, 0) AS `value`
		FROM `tab{XP_DOCTYPE}`
		WHERE `name` = %s
		FOR UPDATE
		""",
		(name,),
		as_dict=True,
	)

	if not row:
		frappe.throw(
			_(
				"You don't have enough XP to open this solution. "
				"You need {0} XP, but you only have 0 XP."
			).format(amount)
		)

	current = cint(row[0].value)

	if current < amount:
		frappe.throw(
			_(
				"You don't have enough XP to open this solution. "
				"You need {0} XP, but you only have {1} XP."
			).format(
				amount,
				current,
			)
		)

	remaining = current - amount

	frappe.db.sql(
		f"""
		UPDATE `tab{XP_DOCTYPE}`
		SET `value` = %s
		WHERE `name` = %s
		""",
		(remaining, name),
	)

	return {
		"deducted": amount,
		"remaining": remaining,
	}