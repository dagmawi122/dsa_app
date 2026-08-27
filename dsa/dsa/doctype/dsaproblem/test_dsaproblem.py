import frappe
from frappe.tests import IntegrationTestCase

from dsa.api import _build_source_code


class IntegrationTestDSAProblem(IntegrationTestCase):
	def test_build_source_code_uses_language_wrapper(self):
		problem = frappe._dict(
			custom_wrapper_code="#include <iostream>\n{{USER_CODE}}\nint main() {}",
			custom_python_wrapper_code="import sys\n{{USER_CODE}}\nprint(solve())",
		)

		self.assertEqual(
			_build_source_code(problem, "def solve():\n    return 42", 71),
			"import sys\ndef solve():\n    return 42\nprint(solve())",
		)

	def test_build_source_code_allows_blank_wrapper(self):
		problem = frappe._dict(custom_javascript_wrapper_code="")

		self.assertEqual(_build_source_code(problem, "console.log('ready')", 63), "console.log('ready')")
