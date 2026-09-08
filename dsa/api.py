from __future__ import annotations

import base64
import binascii
from typing import Any

import frappe
import requests
from frappe import _
from frappe.utils import cint, now_datetime

from dsa.dsa.doctype.contest.contest import get_contest_status

DEFAULT_JUDGE0_URL = "https://ce.judge0.com"
DEFAULT_LANGUAGE_ID = 54  # C++ (GCC 9.2.0)
PENDING_STATUS_IDS = {1, 2}

def _map_judge0_status(status_id: int | None, output_matches: bool) -> str:
    if status_id in PENDING_STATUS_IDS:
        return "Running"
    if status_id == 3:
        return "Accepted" if output_matches else "Wrong Answer"
    if status_id == 4:
        return "Wrong Answer"
    if status_id == 5:
        return "Time Limit Exceeded"
    if status_id == 6:
        return "Compilation Error"
    if status_id in {7, 8, 9, 10, 11, 12}:
        return "Runtime Error"
    return "Failed"

USER_CODE_MARKER = "{{USER_CODE}}"
LANGUAGE_CODE_FIELDS = {
	54: ("custom_starter_code", "custom_wrapper_code"),
	71: ("custom_python_starter_code", "custom_python_wrapper_code"),
	63: ("custom_javascript_starter_code", "custom_javascript_wrapper_code"),
	62: ("custom_java_starter_code", "custom_java_wrapper_code"),
}


def _require_login() -> str:
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Please log in to practice DSA problems."), frappe.PermissionError)
	return user


def _judge0_url() -> str:
	return (frappe.conf.get("judge0_url") or DEFAULT_JUDGE0_URL).rstrip("/")


def _judge0_request(method: str, path: str, **kwargs) -> dict[str, Any]:
	try:
		response = requests.request(
			method,
			f"{_judge0_url()}{path}",
			timeout=15,
			**kwargs,
		)
		response.raise_for_status()
		return response.json()
	except (requests.RequestException, ValueError) as exc:
		frappe.log_error(frappe.get_traceback(), "Judge0 request failed")
		frappe.throw(_("The code runner is currently unavailable: {0}").format(str(exc)))

def _create_judge0_submission(
	code: str, stdin: str, language_id: int, expected_output: str | None = None
) -> str:
	payload = {"source_code": code, "stdin": stdin, "language_id": language_id}
	if expected_output is not None:
		payload["expected_output"] = expected_output
	result = _judge0_request(
		"POST",
		"/submissions?base64_encoded=false&wait=false",
		json=payload,
	)
	if not result.get("token"):
		frappe.throw(_("The code runner did not return a submission token."))
	return result["token"]


def _get_judge0_submission(token: str) -> dict[str, Any]:
	result = _judge0_request(
		"GET",
		f"/submissions/{token}?base64_encoded=true&fields=stdout,stderr,compile_output,message,expected_output,status,time,memory",
	)
	for fieldname in ("stdout", "stderr", "compile_output", "message", "expected_output"):
		value = result.get(fieldname)
		if value:
			try:
				result[fieldname] = base64.b64decode(value).decode("utf-8", errors="replace")
			except (binascii.Error, TypeError, ValueError):
				# Keep Judge0's value visible if a custom deployment returns plain text.
				result[fieldname] = value
	return result


def _language_code_fields(language_id: int) -> tuple[str, str]:
	language_id = cint(language_id)
	if language_id not in LANGUAGE_CODE_FIELDS:
		frappe.throw(_("This programming language is not supported."))
	return LANGUAGE_CODE_FIELDS[language_id]


def _build_source_code(
	problem: "frappe.model.document.Document", user_code: str, language_id: int
) -> str:
	"""Insert editor code into the problem's hidden, language-specific wrapper."""
	_wrapper_field = _language_code_fields(language_id)[1]
	wrapper = problem.get(_wrapper_field) or ""
	if not wrapper.strip():
		# A blank wrapper keeps existing full-program problems working.
		return user_code
	if USER_CODE_MARKER not in wrapper:
		frappe.throw(
			_("The wrapper code for this language must contain {0}.").format(USER_CODE_MARKER)
		)
	return wrapper.replace(USER_CODE_MARKER, user_code, 1)


def _official_expected_output(
	problem: "frappe.model.document.Document", stdin: str, test_case_index: int | None
) -> str | None:
	"""Return the expected output only when Run is using an unchanged official case."""
	index = cint(test_case_index)
	if index < 1 or index > len(problem.test_cases):
		return None
	test_case = problem.test_cases[index - 1]
	if _normalized_output(stdin) != _normalized_output(test_case.custom_input):
		return None
	return test_case.custom_expected_output or ""


def _problem_payload(problem: "frappe.model.document.Document") -> dict[str, Any]:
	starter_codes = {
		str(language_id): problem.get(starter_field) or ""
		for language_id, (starter_field, _wrapper_field) in LANGUAGE_CODE_FIELDS.items()
	}
	return {
		"name": problem.name,
		"route_slug": problem.route_slug,
		"title": problem.title,
		"description": problem.description,
		"difficulty": problem.difficulty,
		"topics": [row.topic for row in problem.get("topics", [])],
		"examples": problem.examples,
		"constraints": problem.constraints,
		"starter_code": starter_codes[str(DEFAULT_LANGUAGE_ID)],
		"starter_codes": starter_codes,
		"test_cases": [
			{"index": index, "input": row.custom_input or ""}
			for index, row in enumerate(problem.test_cases, start=1)
		],
	}


@frappe.whitelist()
def get_problems() -> list[dict[str, Any]]:
	_require_login()
	problems = frappe.get_all(
		"DSAProblem",
		fields=["name", "title", "difficulty", "route_slug"],
		order_by="title asc",
	)
	topics_by_problem = {}
	for row in frappe.get_all(
		"DSA Problem Topic",
		filters={"parenttype": "DSAProblem", "parentfield": "topics"},
		fields=["parent", "topic"],
		order_by="idx asc",
	):
		topics_by_problem.setdefault(row.parent, []).append(row.topic)
	for problem in problems:
		problem["topics"] = topics_by_problem.get(problem.name, [])
	difficulty_order = {"easy": 0, "medium": 1, "hard": 2}
	return sorted(problems, key=lambda problem: (difficulty_order.get(problem.difficulty, 3), problem.title))


@frappe.whitelist()
def get_problem(name: str | None = None, slug: str | None = None) -> dict[str, Any]:
	_require_login()
	if slug:
		name = frappe.db.get_value("DSAProblem", {"route_slug": slug}, "name")
	if not name:
		frappe.throw(_("Problem not found."), frappe.DoesNotExistError)
	return _problem_payload(frappe.get_doc("DSAProblem", name))


def _contest_payload(contest, current_time=None, include_problems=False) -> dict[str, Any]:
    payload = {
        "name": contest.name,
        "title": contest.title,
        "description": contest.description,
        "start_date": contest.start_date,
        "end_date": contest.end_date,
        "status": get_contest_status(
            contest.start_date,
            contest.end_date,
            current_time
        ),
    }

    if include_problems:
        payload["problems"] = [
            {
                "problem": row.problem,
                "order": row.order,
                "points": row.points,
            }
            for row in (contest.problems or [])
        ]

    return payload


@frappe.whitelist()
def get_contests(limit_start: int = 0, limit_page_length: int = 20) -> list[dict[str, Any]]:
    """List contests in chronological order with status calculated at request time."""
    _require_login()

    limit_start = max(cint(limit_start), 0)
    limit_page_length = min(max(cint(limit_page_length), 1), 100)

    current_time = now_datetime()

    contests = frappe.get_all(
        "Contest",
        fields=["name", "title", "description", "start_date", "end_date"],
        order_by="start_date asc",
        offset=limit_start,
        limit=limit_page_length,
    )

    return [
        _contest_payload(contest, current_time)
        for contest in contests
    ]


@frappe.whitelist()
def get_contest(name: str) -> dict[str, Any]:
    """Fetch one contest with its problems."""
    _require_login()

    contest = frappe.get_doc("Contest", name)

    return _contest_payload(
        contest,
        now_datetime(),
        include_problems=True
    )


@frappe.whitelist()
def get_submissions(problem: str) -> list[dict[str, Any]]:
	"""Return only the signed-in user's submissions for the selected problem."""
	user = _require_login()
	# Recover submissions whose browser polling was interrupted by a refresh,
	# navigation, closed tab, or stale frontend bundle.
	unfinished = frappe.get_all(
		"DSA Submission",
		filters={"problem": problem, "member": user, "status": ["in", ["Queued", "Running"]]},
		pluck="name",
		order_by="creation desc",
		limit_page_length=10,
	)
	for submission_name in unfinished:
		_refresh_submission(frappe.get_doc("DSA Submission", submission_name))

	return frappe.get_all(
		"DSA Submission",
		filters={"problem": problem, "member": user},
		fields=[
			"name",
			"status",
			"passed_count",
			"total_count",
			"code",
			"language_id",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=50,
	)


@frappe.whitelist(methods=["POST"])
def run_code(
	problem: str,
	code: str,
	stdin: str = "",
	language_id: int = DEFAULT_LANGUAGE_ID,
	test_case_index: int | None = None,
) -> dict[str, Any]:
	_require_login()
	if not code or not code.strip():
		frappe.throw(_("Enter some code before running it."))
	language_id = cint(language_id)
	problem_doc = frappe.get_doc("DSAProblem", problem)
	source_code = _build_source_code(problem_doc, code, language_id)
	expected_output = _official_expected_output(problem_doc, stdin or "", test_case_index)
	return {
		"token": _create_judge0_submission(
			source_code, stdin or "", language_id, expected_output=expected_output
		)
	}


@frappe.whitelist()
def get_run_result(token: str) -> dict[str, Any]:
	_require_login()
	result = _get_judge0_submission(token)
	status = result.get("status") or {}
	pending = status.get("id") in PENDING_STATUS_IDS
	status_description = status.get("description")
	if not pending and result.get("expected_output") is not None:
		outputs_match = _normalized_output(result.get("stdout")) == _normalized_output(
			result.get("expected_output")
		)
		if status.get("id") == 3 and not outputs_match:
			status_description = "Wrong Answer"
	return {
		"pending": pending,
		"status": status_description,
		"stdout": result.get("stdout"),
		"expected_output": result.get("expected_output"),
		"stderr": result.get("stderr"),
		"compile_output": result.get("compile_output"),
		"message": result.get("message"),
		"time": result.get("time"),
		"memory": result.get("memory"),
	}

def _create_dsa_submission(
    problem_doc,
    user: str,
    code: str,
    language_id: int,
):
    """Create a DSA Submission and submit all test cases to Judge0."""

    if not code or not code.strip():
        frappe.throw(_("Enter some code before submitting it."))

    if not problem_doc.test_cases:
        frappe.throw(_("This problem does not have any test cases."))

    language_id = cint(language_id)

    source_code = _build_source_code(
        problem_doc,
        code,
        language_id,
    )

    submission = frappe.new_doc("DSA Submission")

    submission.problem = problem_doc.name
    submission.member = user
    submission.code = code
    submission.language_id = language_id
    submission.status = "Queued"

    for index, test_case in enumerate(
        problem_doc.test_cases,
        start=1,
    ):
        submission.append(
            "results",
            {
                "test_case_index": index,
                "input": test_case.custom_input or "",
                "expected_output": test_case.custom_expected_output or "",
                "token": _create_judge0_submission(
                    source_code,
                    test_case.custom_input or "",
                    language_id,
                    expected_output=test_case.custom_expected_output or "",
                ),
                "status": "Queued",
            },
        )

    submission.total_count = len(problem_doc.test_cases)

    submission.insert(
        ignore_permissions=True
    )

    return submission
def _get_contest_problem(
    contest: str,
    problem: str,
):
    """Return the problem configuration for a contest."""

    contest_problem = frappe.db.get_value(
        "Contest Problem",
        {
            "parent": contest,
            "parenttype": "Contest",
            "problem": problem,
        },
        [
            "name",
            "problem",
            "points",
            "order",
        ],
        as_dict=True,
    )

    if not contest_problem:
        frappe.throw(
            _("This problem does not belong to the selected contest.")
        )

    if cint(contest_problem.points) < 0:
        frappe.throw(
            _("Contest problem points cannot be negative.")
        )

    return contest_problem

def _require_contest_participant(contest: str, user: str):
    """Make sure the user has joined the contest."""

    registration = frappe.db.exists(
        "Contest Registration",
        {
            "contest": contest,
            "user": user,
            "status": "Joined",
        },
    )

    if not registration:
        frappe.throw(
            _("You must join this contest before submitting.")
        )


def _require_active_contest(contest: str):
    """Make sure the contest is currently active."""

    contest_doc = frappe.get_doc(
        "Contest",
        contest,
    )

    now = frappe.utils.now_datetime()

    start = frappe.utils.get_datetime(
        contest_doc.start_date
    )

    end = frappe.utils.get_datetime(
        contest_doc.end_date
    )

    if now < start:
        frappe.throw(
            _("This contest has not started yet.")
        )

    if now > end:
        frappe.throw(
            _("This contest has already ended.")
        )

    return contest_doc
@frappe.whitelist(methods=["POST"])
def submit_contest_code(
    contest: str,
    problem: str,
    code: str,
    language_id: int = DEFAULT_LANGUAGE_ID,
) -> dict[str, Any]:
    """Submit a solution for a problem inside a contest."""

    user = _require_login()

    # 1. Contest must be active.
    contest_doc = _require_active_contest(contest)

    # 2. User must have joined the contest.
    _require_contest_participant(
        contest=contest,
        user=user,
    )

    # 3. Problem must belong to the contest.
    contest_problem = _get_contest_problem(
        contest=contest,
        problem=problem,
    )

    # Anti-spam cooldown check (3 seconds)
    last_sub = frappe.db.get_value(
        "Contest Submission",
        {"contest": contest_doc.name, "problem": problem, "member": user},
        "creation",
        order_by="creation desc",
    )
    if last_sub:
        if frappe.utils.time_diff_in_seconds(frappe.utils.now_datetime(), last_sub) < 3:
            frappe.throw(_("Please wait a few seconds before submitting again."))

    # 4. Load the DSA problem.
    problem_doc = frappe.get_doc(
        "DSAProblem",
        problem,
    )

    # 5. Create the normal DSA submission.
    dsa_submission = _create_dsa_submission(
        problem_doc=problem_doc,
        user=user,
        code=code,
        language_id=language_id,
    )

    # 6. Create the contest submission record.
    contest_submission = frappe.new_doc(
        "Contest Submission"
    )

    contest_submission.contest = contest_doc.name
    contest_submission.problem = problem_doc.name
    contest_submission.member = user
    contest_submission.dsa_submission = dsa_submission.name
    contest_submission.code = code
    contest_submission.language_id = language_id
    contest_submission.status = "Queued"
    contest_submission.score = 0
    contest_submission.submission_time = frappe.utils.now_datetime()

    contest_submission.insert(
        ignore_permissions=True
    )

    return {
        "contest_submission": contest_submission.name,
        "dsa_submission": dsa_submission.name,
        "status": contest_submission.status,
        "score": contest_submission.score,
        "points": contest_problem.points,
    }
def _calculate_contest_submission_score(
    contest: str,
    problem: str,
    status: str,
) -> int:
    """Calculate the score earned by a contest submission."""

    if status != "Accepted":
        return 0

    points = frappe.db.get_value(
        "Contest Problem",
        {
            "parent": contest,
            "parenttype": "Contest",
            "problem": problem,
        },
        "points",
    )

    return cint(points or 0)

def _refresh_contest_submission(
    contest_submission,
):
    """Refresh the linked DSA submission and update contest score."""

    if not contest_submission.dsa_submission:
        frappe.throw(
            _("This contest submission has no linked DSA submission.")
        )

    dsa_submission = frappe.get_doc(
        "DSA Submission",
        contest_submission.dsa_submission,
    )

    result = _refresh_submission(
        dsa_submission
    )

    # Keep contest submission Running while Judge0 is still processing.
    if result["pending"]:
        contest_submission.status = "Running"
        contest_submission.score = 0
    else:
        contest_submission.status = result["status"]
        contest_submission.score = (
            _calculate_contest_submission_score(
                contest=contest_submission.contest,
                problem=contest_submission.problem,
                status=contest_submission.status,
            )
        )

    contest_submission.save(
        ignore_permissions=True
    )

    return {
        "submission": contest_submission.name,
        "contest": contest_submission.contest,
        "problem": contest_submission.problem,
        "pending": result["pending"],
        "status": contest_submission.status,
        "score": contest_submission.score,
        "passed_count": result["passed_count"],
        "total_count": result["total_count"],
        "results": result["results"],
    }
@frappe.whitelist()
def get_contest_submission_result(
    submission: str,
) -> dict[str, Any]:
    """Return the current result of a contest submission."""

    user = _require_login()

    contest_submission = frappe.get_doc(
        "Contest Submission",
        submission,
    )

    if (
        contest_submission.member != user
        and "System Manager" not in frappe.get_roles(user)
    ):
        frappe.throw(
            _("You are not allowed to view this submission."),
            frappe.PermissionError,
        )

    return _refresh_contest_submission(
        contest_submission
    )
def _get_contest_score_data(
    contest: str,
    member: str,
) -> dict[str, Any]:
    """Calculate a participant's score for a contest."""

    submissions = frappe.get_all(
        "Contest Submission",
        filters={
            "contest": contest,
            "member": member,
        },
        fields=[
            "problem",
            "status",
            "score",
            "submission_time",
        ],
        order_by="submission_time asc",
    )

    # Refresh submissions that are still being processed
    for submission in submissions:
        if submission.status in {"Queued", "Running"}:
            contest_sub = frappe.get_doc("Contest Submission", submission.name)
            res = _refresh_contest_submission(contest_sub)
            submission.status = res["status"]
            submission.score = res["score"]

    problem_scores = {}

    for submission in submissions:

        if submission.status != "Accepted":
            continue

        score = cint(
            submission.score or 0
        )

        current_score = problem_scores.get(
            submission.problem,
            0,
        )

        problem_scores[submission.problem] = max(
            current_score,
            score,
        )

    total_score = sum(
        problem_scores.values()
    )

    solved_count = len(
        problem_scores
    )

    return {
        "contest": contest,
        "member": member,
        "total_score": total_score,
        "solved_count": solved_count,
        "submission_count": len(submissions),
    }
@frappe.whitelist()
def get_contest_score(
    contest: str,
) -> dict[str, Any]:
    """Return the signed-in user's contest score."""

    user = _require_login()

    if not contest:
        return {
            "contest": None,
            "member": user,
            "total_score": 0,
            "solved_count": 0,
            "submission_count": 0,
            "is_registered": False,
        }

    registration = frappe.db.exists(
        "Contest Registration",
        {
            "contest": contest,
            "user": user,
            "status": "Joined",
        },
    )

    if not registration:
        return {
            "contest": contest,
            "member": user,
            "total_score": 0,
            "solved_count": 0,
            "submission_count": 0,
            "is_registered": False,
        }

    data = _get_contest_score_data(
        contest=contest,
        member=user,
    )
    data["is_registered"] = True
    return data
@frappe.whitelist()
def get_contest_progress(
    contest: str,
) -> dict[str, Any]:
    """Return the signed-in user's progress in a contest."""

    user = _require_login()

    if not contest or not frappe.db.exists("Contest", contest):
        return {
            "contest": contest,
            "solved": [],
            "attempted": [],
            "unsolved": [],
            "solved_count": 0,
            "attempted_count": 0,
            "unsolved_count": 0,
            "total_problems": 0,
            "total_score": 0,
            "submission_count": 0,
            "is_registered": False,
        }

    contest_doc = frappe.get_doc("Contest", contest)
    problems_list = [cp.problem for cp in (contest_doc.problems or [])]
    total_problems = len(problems_list)

    registration = frappe.db.exists(
        "Contest Registration",
        {
            "contest": contest,
            "user": user,
            "status": "Joined",
        },
    )

    if not registration:
        return {
            "contest": contest,
            "solved": [],
            "attempted": [],
            "unsolved": problems_list,
            "solved_count": 0,
            "attempted_count": 0,
            "unsolved_count": total_problems,
            "total_problems": total_problems,
            "total_score": 0,
            "submission_count": 0,
            "is_registered": False,
        }

    submissions = frappe.get_all(
        "Contest Submission",
        filters={
            "contest": contest,
            "member": user,
        },
        fields=[
            "name",
            "problem",
            "status",
        ],
        order_by="creation asc",
    )

    for submission in submissions:
        if submission.status in {"Queued", "Running"}:
            contest_submission = frappe.get_doc(
                "Contest Submission",
                submission.name,
            )

            result = _refresh_contest_submission(
                contest_submission
            )

            submission.status = result["status"]

    problem_status = {}

    for submission in submissions:
        problem = submission.problem

        if submission.status == "Accepted":
            problem_status[problem] = "Solved"

        elif problem not in problem_status:
            problem_status[problem] = "Attempted"

    solved = []
    attempted = []
    unsolved = []

    for problem in problems_list:
        status = problem_status.get(
            problem,
            "Unsolved",
        )

        if status == "Solved":
            solved.append(problem)

        elif status == "Attempted":
            attempted.append(problem)

        else:
            unsolved.append(problem)

    score_data = _get_contest_score_data(
        contest=contest,
        member=user,
    )

    return {
        "contest": contest,
        "solved": solved,
        "attempted": attempted,
        "unsolved": unsolved,
        "solved_count": len(solved),
        "attempted_count": len(attempted),
        "unsolved_count": len(unsolved),
        "total_problems": total_problems,
        "total_score": score_data["total_score"],
        "submission_count": score_data["submission_count"],
        "is_registered": True,
    }
@frappe.whitelist()
def get_contest_submissions(
    contest: str,
    problem: str | None = None,
) -> list[dict[str, Any]]:
    """Return the signed-in user's contest submissions."""

    user = _require_login()

    if not contest:
        return []

    registration = frappe.db.exists(
        "Contest Registration",
        {
            "contest": contest,
            "user": user,
            "status": "Joined",
        },
    )

    if not registration:
        return []

    filters = {
        "contest": contest,
        "member": user,
    }

    if problem:
        filters["problem"] = problem

    submissions = frappe.get_all(
        "Contest Submission",
        filters=filters,
        fields=[
            "name",
            "contest",
            "problem",
            "status",
            "score",
            "language_id",
            "dsa_submission",
            "code",
            "submission_time",
            "creation",
        ],
        order_by="submission_time desc",
        limit_page_length=100,
    )

    # Refresh unfinished submissions so that
    # interrupted browser polling can recover.
    for submission in submissions:
        if submission.status in {"Queued", "Running"}:
            contest_submission = frappe.get_doc(
                "Contest Submission",
                submission.name,
            )

            result = _refresh_contest_submission(
                contest_submission
            )

            submission.status = result["status"]
            submission.score = result["score"]
            submission.passed_count = result["passed_count"]
            submission.total_count = result["total_count"]

    # Add passed/total counts from linked DSA submissions.
    for submission in submissions:
        if not hasattr(submission, "passed_count"):
            submission.passed_count = 0

        if not hasattr(submission, "total_count"):
            submission.total_count = 0

        if submission.dsa_submission:
            dsa_data = frappe.db.get_value(
                "DSA Submission",
                submission.dsa_submission,
                ["passed_count", "total_count"],
                as_dict=True,
            )

            if dsa_data:
                submission.passed_count = cint(
                    dsa_data.passed_count or 0
                )
                submission.total_count = cint(
                    dsa_data.total_count or 0
                )

    return submissions


@frappe.whitelist()
def get_contest_leaderboard(
    contest: str,
) -> dict[str, Any]:
    """Return the leaderboard for a contest."""

    _require_login()

    if not contest or not frappe.db.exists("Contest", contest):
        return {
            "contest": contest,
            "leaderboard": [],
    }

    participants = frappe.get_all(
        "Contest Registration",
        filters={
            "contest": contest,
            "status": "Joined",
        },
        fields=[
            "user",
            "joined_at",
        ],
    )

    participant_users = [participant.user for participant in participants]

    user_names = {}

    if participant_users:
        users = frappe.get_all(
            "User",
            filters={"name": ["in", participant_users]},
            fields=["name", "full_name"],
        )

        user_names = {
            user.name: user.full_name
            for user in users
        }

    submissions = frappe.get_all(
        "Contest Submission",
        filters={
            "contest": contest,
        },
        fields=[
            "member",
            "problem",
            "status",
            "score",
            "submission_time",
        ],
        order_by="submission_time asc",
    )

    participant_data = {
        participant.user: {
            "member": participant.user,
            "total_score": 0,
            "solved_count": 0,
            "submission_count": 0,
            "last_accepted_at": None,
            "problem_scores": {},
        }
        for participant in participants
    }

    for submission in submissions:
        member = submission.member

        if member not in participant_data:
            continue

        participant = participant_data[member]
        participant["submission_count"] += 1

        if submission.status != "Accepted":
            continue

        problem = submission.problem
        score = cint(submission.score or 0)

        current_score = participant["problem_scores"].get(problem, 0)

        participant["problem_scores"][problem] = max(
            current_score,
            score,
        )

        participant["last_accepted_at"] = submission.submission_time

    for participant in participant_data.values():
        participant["total_score"] = sum(
            participant["problem_scores"].values()
        )
        participant["solved_count"] = len(
            participant["problem_scores"]
        )

    leaderboard = []

    for participant in participant_data.values():
        leaderboard.append({
            "member": participant["member"],
            "full_name": user_names.get(participant["member"]),
            "total_score": participant["total_score"],
            "solved_count": participant["solved_count"],
            "submission_count": participant["submission_count"],
            "time": participant["last_accepted_at"],
        })

    leaderboard.sort(
        key=lambda row: (
            -row["total_score"],
            -row["solved_count"],
            row["time"] is None,
            row["time"] or "",
        )
    )

    previous_key = None
    current_rank = 0

    for index, row in enumerate(leaderboard, start=1):
        rank_key = (
            row["total_score"],
            row["solved_count"],
            row["time"],
        )

        if rank_key != previous_key:
            current_rank = index
            previous_key = rank_key

        row["rank"] = current_rank

    return {
        "contest": contest,
        "leaderboard": leaderboard,
    }

@frappe.whitelist(methods=["POST"])
def submit_code(
    problem: str,
    code: str,
    language_id: int = DEFAULT_LANGUAGE_ID,
) -> dict[str, Any]:
    user = _require_login()

    problem_doc = frappe.get_doc(
        "DSAProblem",
        problem,
    )

    submission = _create_dsa_submission(
        problem_doc=problem_doc,
        user=user,
        code=code,
        language_id=language_id,
    )

    return {
        "submission": submission.name,
        "status": submission.status,
    }


def _normalized_output(value: str | None) -> str:
	return (value or "").replace("\r\n", "\n").rstrip()


def _refresh_submission(doc: "frappe.model.document.Document") -> dict[str, Any]:
	pending = False
	passed = 0
	public_results = []
	for row in doc.results:
		if row.status in {"Accepted", "Failed"}:
			passed += row.status == "Accepted"
			public_results.append(
				{
					"index": row.test_case_index,
					"status": row.status,
					"input": row.input,
					"expected_output": row.expected_output,
					"actual_output": row.actual_output,
					"error": row.error_output or None,
				}
			)
			continue

		result = _get_judge0_submission(row.token)
		judge_status = result.get("status") or {}
		if judge_status.get("id") in PENDING_STATUS_IDS:
			pending = True
			public_results.append(
				{"index": row.test_case_index, "status": "Running", "input": row.input}
			)
			continue

		row.actual_output = result.get("stdout") or ""
		row.error_output = result.get("compile_output") or result.get("stderr") or result.get("message") or ""
		row.status = (
			"Accepted"
			if judge_status.get("id") == 3
			and _normalized_output(row.actual_output) == _normalized_output(row.expected_output)
			else "Failed"
		)
		passed += row.status == "Accepted"
		public_results.append(
			{
				"index": row.test_case_index,
				"status": row.status,
				"judge_status": judge_status.get("description"),
				"input": row.input,
				"expected_output": row.expected_output,
				"actual_output": row.actual_output,
				"error": row.error_output if row.status == "Failed" else None,
			}
		)

	doc.passed_count = passed
	if pending:
		doc.status = "Running"
	else:
		doc.status = "Accepted" if passed == doc.total_count else "Failed"
	doc.save(ignore_permissions=True)

	return {
		"pending": pending,
		"status": doc.status,
		"passed_count": doc.passed_count,
		"total_count": doc.total_count,
		"results": public_results,
	}


@frappe.whitelist()
def get_submission_result(submission: str) -> dict[str, Any]:
	user = _require_login()
	doc = frappe.get_doc("DSA Submission", submission)
	if doc.member != user and "System Manager" not in frappe.get_roles(user):
		frappe.throw(_("You cannot view this submission."), frappe.PermissionError)
	return _refresh_submission(doc)
