from __future__ import annotations

import base64
import binascii
from typing import Any

import frappe
import requests
from frappe import _
from frappe.utils import cint

DEFAULT_JUDGE0_URL = "https://ce.judge0.com"
DEFAULT_LANGUAGE_ID = 54  # C++ (GCC 9.2.0)
PENDING_STATUS_IDS = {1, 2}
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


def _create_judge0_submission(code: str, stdin: str, language_id: int) -> str:
	result = _judge0_request(
		"POST",
		"/submissions?base64_encoded=false&wait=false",
		json={"source_code": code, "stdin": stdin, "language_id": language_id},
	)
	if not result.get("token"):
		frappe.throw(_("The code runner did not return a submission token."))
	return result["token"]


def _get_judge0_submission(token: str) -> dict[str, Any]:
	result = _judge0_request(
		"GET",
		f"/submissions/{token}?base64_encoded=true&fields=stdout,stderr,compile_output,message,status,time,memory",
	)
	for fieldname in ("stdout", "stderr", "compile_output", "message"):
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


def _problem_payload(problem: "frappe.model.document.Document") -> dict[str, Any]:
	starter_codes = {
		str(language_id): problem.get(starter_field) or ""
		for language_id, (starter_field, _wrapper_field) in LANGUAGE_CODE_FIELDS.items()
	}
	return {
		"name": problem.name,
		"title": problem.title,
		"description": problem.description,
		"difficulty": problem.difficulty,
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
		fields=["name", "title", "difficulty"],
		order_by="title asc",
	)
	difficulty_order = {"easy": 0, "medium": 1, "hard": 2}
	return sorted(problems, key=lambda problem: (difficulty_order.get(problem.difficulty, 3), problem.title))


@frappe.whitelist()
def get_problem(name: str) -> dict[str, Any]:
	_require_login()
	return _problem_payload(frappe.get_doc("DSAProblem", name))


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
			"creation",
		],
		order_by="creation desc",
		limit_page_length=50,
	)


@frappe.whitelist(methods=["POST"])
def run_code(
	problem: str, code: str, stdin: str = "", language_id: int = DEFAULT_LANGUAGE_ID
) -> dict[str, Any]:
	_require_login()
	if not code or not code.strip():
		frappe.throw(_("Enter some code before running it."))
	language_id = cint(language_id)
	problem_doc = frappe.get_doc("DSAProblem", problem)
	source_code = _build_source_code(problem_doc, code, language_id)
	return {"token": _create_judge0_submission(source_code, stdin or "", language_id)}


@frappe.whitelist()
def get_run_result(token: str) -> dict[str, Any]:
	_require_login()
	result = _get_judge0_submission(token)
	status = result.get("status") or {}
	return {
		"pending": status.get("id") in PENDING_STATUS_IDS,
		"status": status.get("description"),
		"stdout": result.get("stdout"),
		"stderr": result.get("stderr"),
		"compile_output": result.get("compile_output"),
		"message": result.get("message"),
		"time": result.get("time"),
		"memory": result.get("memory"),
	}


@frappe.whitelist(methods=["POST"])
def submit_code(problem: str, code: str, language_id: int = DEFAULT_LANGUAGE_ID) -> dict[str, Any]:
	user = _require_login()
	if not code or not code.strip():
		frappe.throw(_("Enter some code before submitting it."))

	problem_doc = frappe.get_doc("DSAProblem", problem)
	if not problem_doc.test_cases:
		frappe.throw(_("This problem does not have any test cases."))
	language_id = cint(language_id)
	source_code = _build_source_code(problem_doc, code, language_id)

	submission = frappe.new_doc("DSA Submission")
	submission.problem = problem_doc.name
	submission.member = user
	submission.code = code
	submission.language_id = language_id
	submission.status = "Queued"
	for index, test_case in enumerate(problem_doc.test_cases, start=1):
		submission.append(
			"results",
			{
				"test_case_index": index,
				"input": test_case.custom_input or "",
				"expected_output": test_case.custom_expected_output or "",
				"token": _create_judge0_submission(
					source_code, test_case.custom_input or "", language_id
				),
				"status": "Queued",
			},
		)
	submission.total_count = len(problem_doc.test_cases)
	submission.insert(ignore_permissions=True)
	return {"submission": submission.name, "status": submission.status}


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
