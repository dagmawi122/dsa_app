import re
import unicodedata

import frappe


def make_problem_slug(title, name=None):
	"""Create a readable URL slug without changing existing problem identifiers."""
	text = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode()
	base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:100].rstrip("-") or "problem"
	slug = base
	suffix = 2
	while frappe.db.exists("DSAProblem", {"route_slug": slug, "name": ["!=", name or ""]}):
		slug = f"{base}-{suffix}"
		suffix += 1
	return slug
