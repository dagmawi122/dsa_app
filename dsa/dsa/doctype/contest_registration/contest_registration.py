from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class ContestRegistration(Document):
    def validate(self):
        if not self.user:
            frappe.throw(_("User is required."))

        if not self.contest:
            frappe.throw(_("Contest is required."))

        if not self.joined_at:
            self.joined_at = now_datetime()

        # Prevent duplicate registration
        existing = frappe.db.exists(
            "Contest Registration",
            {
                "user": self.user,
                "contest": self.contest,
                "name": ["!=", self.name],
            },
        )

        if existing:
            frappe.throw(_("User is already registered for this contest."))


@frappe.whitelist()
def join_contest(contest):
    """Register the current user for a contest."""

    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in to join a contest."))

    user = frappe.session.user

    # Check that the contest exists
    contest_doc = frappe.get_doc("Contest", contest)

    # Do not allow joining after the contest has completed
    if contest_doc.status == "Completed":
        frappe.throw(_("You cannot join a completed contest."))

    # Prevent duplicate registration
    existing = frappe.db.exists(
        "Contest Registration",
        {
            "user": user,
            "contest": contest,
        },
    )

    if existing:
        frappe.throw(_("You have already joined this contest."))

    registration = frappe.get_doc(
        {
            "doctype": "Contest Registration",
            "user": user,
            "contest": contest,
            "joined_at": now_datetime(),
            "status": "Joined",
        }
    )

    registration.insert(ignore_permissions=True)

    return {
        "success": True,
        "message": _("Successfully joined the contest."),
        "registration": registration.name,
    }


@frappe.whitelist()
def leave_contest(contest):
    """Leave a contest if the user is registered."""

    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in to leave a contest."))

    user = frappe.session.user

    registration_name = frappe.db.exists(
        "Contest Registration",
        {
            "user": user,
            "contest": contest,
        },
    )

    if not registration_name:
        frappe.throw(_("You are not registered for this contest."))

    registration = frappe.get_doc(
        "Contest Registration",
        registration_name,
    )

    registration.status = "Left"
    registration.save(ignore_permissions=True)

    return {
        "success": True,
        "message": _("You have left the contest."),
    }


@frappe.whitelist()
def get_my_contests():
    """Return contests joined by the current user."""

    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in."))

    user = frappe.session.user

    registrations = frappe.get_all(
        "Contest Registration",
        filters={
            "user": user,
            "status": "Joined",
        },
        fields=[
            "name",
            "contest",
            "joined_at",
            "status",
        ],
        order_by="joined_at desc",
        ignore_permissions=True,
    )

    return registrations


@frappe.whitelist()
def get_participant_status(contest):
    """Return the current user's participation status for a contest."""

    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in."))

    user = frappe.session.user

    registration = frappe.db.get_value(
        "Contest Registration",
        {
            "user": user,
            "contest": contest,
        },
        ["name", "status", "joined_at"],
        as_dict=True,
    )

    if not registration:
        return {
            "registered": False,
            "status": None,
            "joined_at": None,
        }

    return {
        "registered": registration.status == "Joined",
        "status": registration.status,
        "joined_at": registration.joined_at,
        "registration": registration.name,
    }