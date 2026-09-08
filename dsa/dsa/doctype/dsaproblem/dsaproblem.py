import frappe
from frappe import _
from frappe.model.document import Document

from dsa.api import LANGUAGE_CODE_FIELDS, USER_CODE_MARKER
from dsa.problem_routes import make_problem_slug


class DSAProblem(Document):
	def validate(self):
		if not self.route_slug:
			self.route_slug = make_problem_slug(self.title, self.name)
		for _language_id, (_starter_field, wrapper_field) in LANGUAGE_CODE_FIELDS.items():
			wrapper = self.get(wrapper_field) or ""
			if wrapper.strip() and USER_CODE_MARKER not in wrapper:
				frappe.throw(
					_("{0} must contain {1}.").format(_(self.meta.get_label(wrapper_field)), USER_CODE_MARKER)
				)
