import frappe
from frappe.utils import now_datetime


def send_new_contest_notification(doc, method=None):

	template = frappe.get_doc("Email Template", "New Contest")

	context = doc.as_dict()
	context["site_url"] = frappe.utils.get_url()

	subject = frappe.render_template(
		template.subject,
		context,
	)

	message = frappe.render_template(
		template.response_html,
		context,
	)


	registrations = frappe.get_all(
		"Contest Registration",
		filters={
			"status": "Joined",
		},
		fields=["user"],
	)


	user_names = list({
		registration.user
		for registration in registrations
		if registration.user
	})

	if not user_names:
		return

	users = frappe.get_all(
		"User",
		filters={
			"name": ["in", user_names],
			"enabled": 1,
		},
		fields=["email"],
	)

	recipients = [
		user.email
		for user in users
		if user.email
	]

	if not recipients:
		return

	frappe.sendmail(
		recipients=recipients,
		subject=subject,
		message=message,
	)


def send_contest_start_notifications():
	"""Email users about contests starting today."""

	now = now_datetime()

	start_of_day = now.replace(
		hour=0,
		minute=0,
		second=0,
		microsecond=0,
	)

	end_of_day = now.replace(
		hour=23,
		minute=59,
		second=59,
		microsecond=999999,
	)

	contests = frappe.get_all(
		"Contest",
		filters=[
			["start_date", ">=", start_of_day],
			["start_date", "<=", end_of_day],
		],
		fields=["name"],
	)

	if not contests:
		return

	template = frappe.get_doc(
		"Email Template",
		"Contest Starts Today",
	)

	users = frappe.get_all(
		"User",
		filters={
			"enabled": 1,
		},
		fields=["email"],
	)

	recipients = [
		user.email
		for user in users
		if user.email
	]

	if not recipients:
		return

	for contest in contests:
		contest_doc = frappe.get_doc("Contest", contest.name)

		context = contest_doc.as_dict()
		context["site_url"] = frappe.utils.get_url()

		subject = frappe.render_template(
			template.subject,
			context,
		)

		message = frappe.render_template(
			template.response_html,
			context,
		)

		frappe.sendmail(
			recipients=recipients,
			subject=subject,
			message=message,
		)