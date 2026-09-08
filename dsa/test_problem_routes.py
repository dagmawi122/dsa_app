from unittest import TestCase
from unittest.mock import MagicMock, patch

import frappe

from dsa.api import get_problem
from dsa.problem_routes import make_problem_slug


class TestProblemRoutes(TestCase):
	@patch("dsa.problem_routes.frappe.db", new_callable=MagicMock)
	def test_readable_slug(self, db):
		db.exists.return_value = False
		self.assertEqual(make_problem_slug("Two Sums!"), "two-sums")
		self.assertEqual(make_problem_slug("  Café & Arrays  "), "cafe-arrays")
		self.assertEqual(make_problem_slug("!!!"), "problem")

	@patch("dsa.problem_routes.frappe.db", new_callable=MagicMock)
	def test_duplicate_titles_get_unique_suffix(self, db):
		db.exists.side_effect = [True, True, False]
		self.assertEqual(make_problem_slug("Two Sums", "problem-id"), "two-sums-3")
		self.assertEqual(db.exists.call_args.args[1]["name"], ["!=", "problem-id"])

	@patch("dsa.api._require_login")
	@patch("dsa.api.frappe.db", new_callable=MagicMock)
	@patch("dsa.api.frappe.get_doc")
	@patch("dsa.api._problem_payload")
	def test_slug_resolves_to_original_problem_id(self, payload, get_doc, db, login):
		db.get_value.return_value = "original-problem-id"
		get_problem(slug="two-sums")
		db.get_value.assert_called_once_with("DSAProblem", {"route_slug": "two-sums"}, "name")
		get_doc.assert_called_once_with("DSAProblem", "original-problem-id")

	@patch("dsa.api._require_login")
	@patch("dsa.api.frappe.db", new_callable=MagicMock)
	@patch("dsa.api.frappe.throw", side_effect=frappe.DoesNotExistError)
	@patch("dsa.api._", side_effect=lambda value: value)
	def test_unknown_slug_is_not_found(self, translate, throw, db, login):
		db.get_value.return_value = None
		with self.assertRaises(frappe.DoesNotExistError):
			get_problem(slug="missing")

	@patch("dsa.api._require_login")
	@patch("dsa.api.frappe.get_doc")
	@patch("dsa.api._problem_payload")
	def test_contests_can_still_load_by_id(self, payload, get_doc, login):
		get_problem(name="contest-problem-id")
		get_doc.assert_called_once_with("DSAProblem", "contest-problem-id")
