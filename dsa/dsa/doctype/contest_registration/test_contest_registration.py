import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_to_date, now_datetime


class TestContestRegistration(FrappeTestCase):

    def setUp(self):
        self.user = frappe.session.user

        # Use Administrator during backend tests if necessary
        if self.user == "Guest":
            self.user = "Administrator"

    def create_contest(self, start_offset_hours=-1, end_offset_hours=2):
        start = add_to_date(
            now_datetime(),
            hours=start_offset_hours,
        )

        end = add_to_date(
            now_datetime(),
            hours=end_offset_hours,
        )

        contest = frappe.get_doc(
            {
                "doctype": "Contest",
                "title": "Test Contest",
                "description": "Contest registration test",
                "start_date": start,
                "end_date": end,
            }
        )

        contest.insert(ignore_permissions=True)

        return contest

    def test_contest_status_is_active(self):
        contest = self.create_contest()

        self.assertEqual(contest.status, "Active")

    def test_registration_can_be_created(self):
        contest = self.create_contest()

        registration = frappe.get_doc(
            {
                "doctype": "Contest Registration",
                "user": self.user,
                "contest": contest.name,
                "status": "Joined",
            }
        )

        registration.insert(ignore_permissions=True)

        self.assertEqual(registration.status, "Joined")

    def test_duplicate_registration_is_rejected(self):
        contest = self.create_contest()

        first = frappe.get_doc(
            {
                "doctype": "Contest Registration",
                "user": self.user,
                "contest": contest.name,
                "status": "Joined",
            }
        )

        first.insert(ignore_permissions=True)

        second = frappe.get_doc(
            {
                "doctype": "Contest Registration",
                "user": self.user,
                "contest": contest.name,
                "status": "Joined",
            }
        )

        self.assertRaises(
            frappe.ValidationError,
            second.insert,
            ignore_permissions=True,
        )