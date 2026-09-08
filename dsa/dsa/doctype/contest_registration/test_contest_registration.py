import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_to_date, now_datetime


class TestContestRegistration(FrappeTestCase):
	def setUp(self):
		self.user = frappe.session.user

		# Use Administrator during backend tests if necessary
		if self.user == "Guest":
			self.user = "Administrator"

	def create_problem(self):
		"""Create a valid DSAProblem for the test Contest."""

		problem = frappe.get_doc(
			{
				"doctype": "DSAProblem",
				"title": "Test Two Sum Problem",
				"difficulty": "easy",
				"description": "Find the sum of two numbers.",
				"test_cases": [
					{
						"custom_input": "1 2",
						"custom_expected_output": "3",
					}
				],
			}
		)

		problem.insert(ignore_permissions=True)

		return problem

	def create_contest(self, start_offset_hours=-1, end_offset_hours=2):
		start = add_to_date(
			now_datetime(),
			hours=start_offset_hours,
		)

		end = add_to_date(
			now_datetime(),
			hours=end_offset_hours,
		)

		# Create a valid DSAProblem first
		problem = self.create_problem()

		# Create Contest with the required Contest Problem
		contest = frappe.get_doc(
			{
				"doctype": "Contest",
				"title": "Test Contest",
				"description": "Contest registration test",
				"start_date": start,
				"end_date": end,
				"problems": [
					{
						"problem": problem.name,
						"order": 1,
						"points": 100,
					}
				],
			}
		)

		contest.insert(ignore_permissions=True)

		return contest

	def test_contest_status_is_active(self):
		contest = self.create_contest()

		self.assertEqual(
			contest.status,
			"Active",
		)

	def test_registration_can_be_created(self):
		contest = self.create_contest()

		registration = frappe.get_doc(
			{
				"doctype": "Contest Registration",
				"user": self.user,
				"contest": contest.name,
				"status": "Joined",
			}
		)

		registration.insert(ignore_permissions=True)

		self.assertEqual(
			registration.status,
			"Joined",
		)

	def test_duplicate_registration_is_rejected(self):
		contest = self.create_contest()

		first = frappe.get_doc(
			{
				"doctype": "Contest Registration",
				"user": self.user,
				"contest": contest.name,
				"status": "Joined",
			}
		)

		first.insert(ignore_permissions=True)

		second = frappe.get_doc(
			{
				"doctype": "Contest Registration",
				"user": self.user,
				"contest": contest.name,
				"status": "Joined",
			}
		)

		self.assertRaises(
			frappe.ValidationError,
			second.insert,
			ignore_permissions=True,
		)
