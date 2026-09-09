from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import frappe

from dsa.www.dsa_practice import get_context


class TestStudentEditor(TestCase):
	@patch("dsa.www.dsa_practice.frappe")
	def test_guest_login_redirect_preserves_problem_and_embed(self, framework):
		framework.session.user = "Guest"
		framework.Redirect = frappe.Redirect
		framework.form_dict.get.side_effect = {"problem": "problem & 1", "embedded": "1"}.get
		with self.assertRaises(frappe.Redirect) as redirect:
			get_context(SimpleNamespace())
		self.assertEqual(redirect.exception.http_status_code, 302)
		location = framework.local.flags.redirect_location
		target = parse_qs(urlsplit(location).query)["redirect-to"][0]
		self.assertEqual(parse_qs(urlsplit(target).query), {"problem": ["problem & 1"], "embedded": ["1"]})
		framework.db.exists.assert_not_called()

	@patch("dsa.www.dsa_practice.frappe")
	def test_logged_in_student_can_load_without_desk_permissions(self, framework):
		framework.session.user = "student@example.com"
		framework.form_dict.get.side_effect = {"problem": "problem-1", "embedded": "1"}.get
		framework.db.exists.return_value = True
		framework.db.get_value.return_value = "Two Sum"
		framework.get_installed_apps.return_value = ["frappe", "dsa"]
		context = SimpleNamespace()
		get_context(context)
		self.assertEqual(context.problem_name, "problem-1")
		self.assertTrue(context.embedded)
		self.assertEqual(context.title, "Two Sum")

	@patch("dsa.www.dsa_practice._", side_effect=lambda text: text)
	@patch("dsa.www.dsa_practice.frappe")
	def test_missing_problem_is_rejected(self, framework, translate):
		framework.session.user = "student@example.com"
		framework.form_dict.get.side_effect = {"problem": "missing"}.get
		framework.db.exists.return_value = False
		framework.throw.side_effect = frappe.DoesNotExistError
		with self.assertRaises(frappe.DoesNotExistError):
			get_context(SimpleNamespace())
