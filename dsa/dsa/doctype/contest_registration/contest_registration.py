from __future__ import annotations

from typing import Any
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime
from dsa.dsa.doctype.contest.contest import get_contest_status


class ContestRegistration(Document):
    def validate(self):
        if not self.user:
            frappe.throw(_('user is required.'))

        if not self.contest:
            frappe.throw(_('Contest is required.'))

        if not self.joined_at:
            self.joined_at = now_datetime()

        # Prevent duplicate active registration
        existing = frappe.db.exists(
            'Contest Registration',
            {
                'user': self.user,
                'contest': self.contest,
                'status': 'Joined',
                'name': ['!=', self.name],
            },
        )

        if existing:
            frappe.throw(_('User is already registered for this contest.'))


@frappe.whitelist()
def join_contest(contest: str) -> dict[str, Any]:
    '''Register the current user for a contest.'''
    if frappe.session.user == 'Guest':
        frappe.throw(_('You must be logged in to join a contest.'))

    user = frappe.session.user

    # Check that the contest exists
    contest_doc = frappe.get_doc('Contest', contest)

    now = now_datetime()
    end = get_datetime(contest_doc.end_date)

    # Do not allow joining after the contest has ended
    if now > end:
        frappe.throw(_('You cannot join a contest that has already ended.'))

    # Check existing registration
    existing_name = frappe.db.get_value(
        'Contest Registration',
        {
            'user': user,
            'contest': contest,
        },
        'name',
    )

    if existing_name:
        registration = frappe.get_doc('Contest Registration', existing_name)
        if registration.status == 'Joined':
            frappe.throw(_('You have already joined this contest.'))
        registration.status = 'Joined'
        registration.joined_at = now
        registration.save(ignore_permissions=True)
        return {
            'success': True,
            'message': _('Successfully joined the contest.'),
            'registration': registration.name,
        }

    registration = frappe.get_doc(
        {
            'doctype': 'Contest Registration',
            'user': user,
            'contest': contest,
            'joined_at': now,
            'status': 'Joined',
        }
    )

    registration.insert(ignore_permissions=True)

    return {
        'success': True,
        'message': _('Successfully joined the contest.'),
        'registration': registration.name,
    }


@frappe.whitelist()
def leave_contest(contest: str) -> dict[str, Any]:
    '''Leave a contest if the user is registered.'''
    if frappe.session.user == 'Guest':
        frappe.throw(_('You must be logged in to leave a contest.'))

    user = frappe.session.user

    registration_name = frappe.db.exists(
        'Contest Registration',
        {
            'user': user,
            'contest': contest,
            'status': 'Joined',
        },
    )

    if not registration_name:
        frappe.throw(_('You are not registered for this contest.'))

    registration = frappe.get_doc(
        'Contest Registration',
        registration_name,
    )

    registration.status = 'Left'
    registration.save(ignore_permissions=True)

    return {
        'success': True,
        'message': _('You have left the contest.'),
    }


@frappe.whitelist()
def get_my_contests() -> list[dict[str, Any]]:
    '''Return contests joined by the current user with full details.'''
    if frappe.session.user == 'Guest':
        frappe.throw(_('You must be logged in.'))

    user = frappe.session.user

    registrations = frappe.get_all(
        'Contest Registration',
        filters={
            'user': user,
            'status': 'Joined',
        },
        fields=[
            'name',
            'contest',
            'joined_at',
            'status',
        ],
        order_by='joined_at desc',
        ignore_permissions=True,
    )

    result = []
    current_time = now_datetime()

    for reg in registrations:
        contest_data = frappe.db.get_value(
            'Contest',
            reg.contest,
            ['name', 'title', 'description', 'start_date', 'end_date'],
            as_dict=True,
        )
        if not contest_data:
            continue

        problem_count = frappe.db.count(
            'Contest Problem',
            {'parent': reg.contest, 'parenttype': 'Contest'},
        )

        status = get_contest_status(
            contest_data.start_date,
            contest_data.end_date,
            current_time,
        )

        result.append(
            {
                'registration': reg.name,
                'name': contest_data.name,
                'contest': contest_data.name,
                'title': contest_data.title,
                'description': contest_data.description,
                'start_date': contest_data.start_date,
                'end_date': contest_data.end_date,
                'status': status,
                'problem_count': problem_count,
                'joined_at': reg.joined_at,
            }
        )

    return result


@frappe.whitelist()
def get_participant_status(contest: str) -> dict[str, Any]:
    '''Return the current user\'s participation status for a contest.'''
    if frappe.session.user == 'Guest':
        return {
            'registered': False,
            'status': None,
            'joined_at': None,
        }

    user = frappe.session.user

    registration = frappe.db.get_value(
        'Contest Registration',
        {
            'user': user,
            'contest': contest,
        },
        ['name', 'status', 'joined_at'],
        as_dict=True,
    )

    if not registration:
        return {
            'registered': False,
            'status': None,
            'joined_at': None,
        }

    return {
        'registered': registration.status == 'Joined',
        'status': registration.status,
        'joined_at': registration.joined_at,
        'registration': registration.name,
    }
