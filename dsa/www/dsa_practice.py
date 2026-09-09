from urllib.parse import quote

import frappe
from frappe import _

no_cache = 1


def get_context(context):
	problem = frappe.form_dict.get("problem")
	if frappe.session.user == "Guest":
		target = "/dsa-practice?problem=" + quote(problem or "", safe="")
		if frappe.form_dict.get("embedded") == "1":
			target += "&embedded=1"
		frappe.local.flags.redirect_location = "/login?redirect-to=" + quote(target, safe="")
		raise frappe.Redirect(http_status_code=302)
	if not problem or not frappe.db.exists("DSAProblem", problem):
		frappe.throw(_("Problem not found."), frappe.DoesNotExistError)
	context.title = frappe.db.get_value("DSAProblem", problem, "title")
	context.problem_name = problem
	context.embedded = frappe.form_dict.get("embedded") == "1"
	context.back_url = "/app/list-problems"
	if "lms" in frappe.get_installed_apps():
		from lms.lms.utils import get_lms_route

		context.back_url = get_lms_route("programming-exercises")
