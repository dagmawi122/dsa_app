frappe.pages["dsa-practice"].on_page_load = function (wrapper) {
	frappe.require("dsa.bundle.js").then(() => {
		wrapper.dsa_practice = new window.dsa.DSAPractice(wrapper);
	});
};

frappe.pages["dsa-practice"].on_page_show = function (wrapper) {
	wrapper.dsa_practice?.refresh();
};
