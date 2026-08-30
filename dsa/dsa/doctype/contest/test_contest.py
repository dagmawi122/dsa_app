from datetime import datetime, timedelta
from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from dsa.api import get_contest, get_contests
from dsa.dsa.doctype.contest.contest import get_contest_status


class IntegrationTestContest(IntegrationTestCase):
	def setUp(self):
		self.original_user = frappe.session.user
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user(self.original_user)

	def test_status_before_start_is_upcoming(self):
		now = datetime(2026, 8, 30, 12)
		self.assertEqual(
			get_contest_status(now + timedelta(seconds=1), now + timedelta(hours=1), now),
			"Upcoming",
		)

	def test_status_at_start_is_active(self):
		now = datetime(2026, 8, 30, 12)
		self.assertEqual(get_contest_status(now, now + timedelta(hours=1), now), "Active")

	def test_status_between_dates_is_active(self):
		now = datetime(2026, 8, 30, 12)
		self.assertEqual(
			get_contest_status(now - timedelta(hours=1), now + timedelta(hours=1), now),
			"Active",
		)

	def test_status_at_end_is_active(self):
		now = datetime(2026, 8, 30, 12)
		self.assertEqual(get_contest_status(now - timedelta(hours=1), now, now), "Active")

	def test_status_after_end_is_completed(self):
		now = datetime(2026, 8, 30, 12)
		self.assertEqual(
			get_contest_status(now - timedelta(hours=1), now - timedelta(seconds=1), now),
			"Completed",
		)

	def test_end_date_must_be_after_start_date(self):
		start = datetime(2026, 8, 30, 12)
		for end in (start, start - timedelta(seconds=1)):
			contest = frappe.get_doc(
				{
					"doctype": "Contest",
					"title": "Invalid Contest",
					"description": "Invalid date range",
					"start_date": start,
					"end_date": end,
				}
			)
			with self.assertRaisesRegex(frappe.ValidationError, "End Date must be after Start Date"):
				contest.insert()

	def test_required_fields_are_enforced(self):
		now = datetime(2026, 8, 30, 12)
		valid_values = {
			"title": "Required Fields Contest",
			"description": "Every public field is required",
			"start_date": now,
			"end_date": now + timedelta(hours=1),
		}

		for missing_field in valid_values:
			values = valid_values.copy()
			values.pop(missing_field)
			contest = frappe.get_doc({"doctype": "Contest", **values})
			with self.assertRaises(frappe.MandatoryError):
				contest.insert()

	def test_status_is_set_on_validation(self):
		now = datetime(2026, 8, 30, 12)
		contest = frappe.get_doc(
			{
				"doctype": "Contest",
				"title": "Status Contest",
				"description": "Status is managed by the server",
				"start_date": now - timedelta(hours=1),
				"end_date": now + timedelta(hours=1),
				"status": "Completed",
			}
		)
		with patch("dsa.dsa.doctype.contest.contest.now_datetime", return_value=now):
			contest.insert()
		self.assertEqual(contest.status, "Active")

	def test_list_and_fetch_contests_return_current_status(self):
		now = datetime(2026, 8, 30, 12)
		contests = [
			self._create_contest("Upcoming API Contest", now + timedelta(hours=1), now + timedelta(hours=2)),
			self._create_contest("Active API Contest", now - timedelta(hours=1), now + timedelta(hours=1)),
			self._create_contest("Completed API Contest", now - timedelta(hours=2), now - timedelta(hours=1)),
		]

		with patch("dsa.api.now_datetime", return_value=now):
			listed = get_contests(limit_start=0, limit_page_length=100)
			fetched = get_contest(contests[1].name)

		listed_by_name = {contest["name"]: contest for contest in listed}
		self.assertEqual(listed_by_name[contests[0].name]["status"], "Upcoming")
		self.assertEqual(listed_by_name[contests[1].name]["status"], "Active")
		self.assertEqual(listed_by_name[contests[2].name]["status"], "Completed")
		self.assertEqual(fetched["name"], contests[1].name)
		self.assertEqual(fetched["status"], "Active")

		with patch("dsa.api.now_datetime", return_value=now):
			first_page = get_contests(limit_start=0, limit_page_length=1)
			second_page = get_contests(limit_start=1, limit_page_length=1)
		self.assertEqual(len(first_page), 1)
		self.assertEqual(len(second_page), 1)
		self.assertNotEqual(first_page[0]["name"], second_page[0]["name"])

	def test_fetch_missing_contest_raises_does_not_exist(self):
		with self.assertRaises(frappe.DoesNotExistError):
			get_contest("CONT-DOES-NOT-EXIST")

	def test_contest_apis_require_login(self):
		frappe.set_user("Guest")
		with self.assertRaises(frappe.PermissionError):
			get_contests()
		with self.assertRaises(frappe.PermissionError):
			get_contest("CONT-00001")

	def _create_contest(self, title, start_date, end_date):
		return frappe.get_doc(
			{
				"doctype": "Contest",
				"title": title,
				"description": f"Description for {title}",
				"start_date": start_date,
				"end_date": end_date,
			}
		).insert()
