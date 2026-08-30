from __future__ import annotations

from datetime import datetime

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime


def get_contest_status(start_date: datetime | str, end_date: datetime | str, current_time=None) -> str:
	"""Return the contest status for the supplied time.

	The end boundary is inclusive: a contest is completed only after its end date.
	"""
	start = get_datetime(start_date)
	end = get_datetime(end_date)
	current = get_datetime(current_time) if current_time is not None else now_datetime()

	if current < start:
		return "Upcoming"
	if current <= end:
		return "Active"
	return "Completed"


class Contest(Document):
	def validate(self):
		# Frappe checks mandatory fields after controller validation.
		# Let that standard check report a precise error for incomplete records.
		if not self.start_date or not self.end_date:
			return

		start = get_datetime(self.start_date)
		end = get_datetime(self.end_date)

		if end <= start:
			frappe.throw(_("End Date must be after Start Date."))

		self.status = get_contest_status(start, end)
