from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from dsa.api import _build_source_code, _create_judge0_submission, _official_expected_output


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

	@patch("dsa.api._judge0_request")
	def test_judge0_submission_includes_expected_output(self, judge0_request):
		judge0_request.return_value = {"token": "submission-token"}

		_create_judge0_submission("code", "10 20", 54, expected_output="30")

		self.assertEqual(
			judge0_request.call_args.kwargs["json"],
			{
				"source_code": "code",
				"stdin": "10 20",
				"language_id": 54,
				"expected_output": "30",
			},
		)

	def test_run_uses_expected_output_only_for_unchanged_official_case(self):
		problem = frappe._dict(
			test_cases=[frappe._dict(custom_input="10 20\n", custom_expected_output="30\n")]
		)

		self.assertEqual(_official_expected_output(problem, "10 20", 1), "30\n")
		self.assertIsNone(_official_expected_output(problem, "20 30", 1))
		self.assertIsNone(_official_expected_output(problem, "10 20", 2))
