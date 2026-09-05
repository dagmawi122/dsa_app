frappe.pages["contest-solve"].on_page_load = function (wrapper) {
	frappe.require("dsa.bundle.js").then(() => {
		wrapper.contest_solve = new window.dsa.ContestProblem(wrapper);
	});
};

frappe.pages["contest-solve"].on_page_show = function (wrapper) {
	wrapper.contest_solve?.refresh();
};
