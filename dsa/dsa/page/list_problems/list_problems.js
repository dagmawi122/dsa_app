frappe.pages["list-problems"].on_page_load = function (wrapper) {
	frappe.require("dsa.bundle.js").then(() => {
		wrapper.problem_list = new window.dsa.ProblemList(wrapper);
	});
};

frappe.pages["list-problems"].on_page_show = function (wrapper) {
	wrapper.problem_list?.refresh();
};
