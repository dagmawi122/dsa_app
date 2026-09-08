import frappe

from dsa.problem_routes import make_problem_slug


def execute():
	for problem in frappe.get_all(
		"DSAProblem", fields=["name", "title", "route_slug"], order_by="creation asc, name asc"
	):
		if not problem.route_slug:
			frappe.db.set_value(
				"DSAProblem",
				problem.name,
				"route_slug",
				make_problem_slug(problem.title, problem.name),
				update_modified=False,
			)
