import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import cint

from dsa.api import (
	_calculate_contest_submission_score,
	_get_contest_problem,
	_get_contest_score_data,
	_map_judge0_status,
)


class TestContestSubmission(FrappeTestCase):
	def setUp(self):
		self.user = "test@example.com"

		if not frappe.db.exists(
			"User",
			self.user,
		):
			user = frappe.new_doc("User")
			user.email = self.user
			user.first_name = "Contest"
			user.last_name = "Tester"
			user.enabled = 1
			user.insert(ignore_permissions=True)

	def _create_problem(self, title):
		"""Create a valid DSA problem for testing."""

		problem = frappe.new_doc("DSAProblem")

		problem.title = title
		problem.difficulty = "easy"
		problem.description = "Test problem for contest submission."

		problem.append(
			"test_cases",
			{
				"custom_input": "1 2",
				"custom_expected_output": "3",
			},
		)

		problem.insert(ignore_permissions=True)

		return problem

	def _create_contest(
		self,
		problem,
		points=20,
	):
		"""Create an active contest containing a problem."""

		contest = frappe.new_doc("Contest")

		contest.title = "Contest Submission Test"
		contest.description = "Test contest for contest submission."

		contest.start_date = frappe.utils.add_days(
			frappe.utils.now_datetime(),
			-1,
		)

		contest.end_date = frappe.utils.add_days(
			frappe.utils.now_datetime(),
			1,
		)

		contest.append(
			"problems",
			{
				"problem": problem.name,
				"order": 1,
				"points": points,
			},
		)

		contest.insert(ignore_permissions=True)

		return contest

	def test_contest_problem_points(self):
		problem = self._create_problem("Scoring Test Problem")

		contest = self._create_contest(
			problem,
			points=20,
		)

		result = _get_contest_problem(
			contest=contest.name,
			problem=problem.name,
		)

		self.assertEqual(
			cint(result.points),
			20,
		)

	def test_accepted_submission_gets_points(self):
		problem = self._create_problem("Accepted Problem")

		contest = self._create_contest(
			problem,
			points=50,
		)

		score = _calculate_contest_submission_score(
			contest=contest.name,
			problem=problem.name,
			status="Accepted",
		)

		self.assertEqual(
			score,
			50,
		)

	def test_failed_submission_gets_zero(self):
		problem = self._create_problem("Failed Problem")

		contest = self._create_contest(
			problem,
			points=50,
		)

		score = _calculate_contest_submission_score(
			contest=contest.name,
			problem=problem.name,
			status="Wrong Answer",
		)

		self.assertEqual(
			score,
			0,
		)

	def test_judge0_status_mapping(self):
		self.assertEqual(_map_judge0_status(3, True), "Accepted")
		self.assertEqual(_map_judge0_status(3, False), "Wrong Answer")
		self.assertEqual(_map_judge0_status(4, False), "Wrong Answer")
		self.assertEqual(_map_judge0_status(5, False), "Time Limit Exceeded")
		self.assertEqual(_map_judge0_status(6, False), "Compilation Error")
		self.assertEqual(_map_judge0_status(11, False), "Runtime Error")
		self.assertEqual(_map_judge0_status(1, False), "Running")
		self.assertEqual(_map_judge0_status(2, False), "Running")
