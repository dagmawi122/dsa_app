from unittest import TestCase
from unittest.mock import patch

import frappe

from dsa.api import get_problems


class TestProblemTopics(TestCase):
	@patch("dsa.api.frappe.get_all")
	@patch("dsa.api._require_login", return_value="learner@example.com")
	def test_problem_list_includes_multiple_topics_and_untagged_problems(self, login, get_all):
		get_all.side_effect = [
			[
				frappe._dict(name="strings", title="Strings", difficulty="medium"),
				frappe._dict(name="arrays", title="Arrays", difficulty="easy"),
				frappe._dict(name="untagged", title="Untagged", difficulty="hard"),
			],
			[
				frappe._dict(parent="arrays", topic="Arrays"),
				frappe._dict(parent="arrays", topic="Hashing"),
				frappe._dict(parent="strings", topic="Strings"),
			],
		]

		problems = get_problems()

		login.assert_called_once()
		self.assertEqual([p.name for p in problems], ["arrays", "strings", "untagged"])
		self.assertEqual([p.topics for p in problems], [["Arrays", "Hashing"], ["Strings"], []])
		self.assertEqual(
			get_all.call_args.kwargs["filters"],
			{"parenttype": "DSAProblem", "parentfield": "topics"},
		)

	@patch("dsa.api.frappe.get_all", return_value=[])
	@patch("dsa.api._require_login", return_value="learner@example.com")
	def test_empty_catalog(self, login, get_all):
		self.assertEqual(get_problems(), [])

	@patch("dsa.api.frappe.get_all")
	@patch("dsa.api._require_login", side_effect=frappe.PermissionError)
	def test_login_required_before_reading_topics(self, login, get_all):
		with self.assertRaises(frappe.PermissionError):
			get_problems()
		get_all.assert_not_called()
