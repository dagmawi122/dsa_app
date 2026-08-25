import { createApp } from "vue";
import DSAPractice from "./components/DSAPractice.vue";

class DSAPracticePage {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("DSA Practice"),
			single_column: true,
		});
		this.page.main.closest(".container").addClass("dsa-page-container");
		this.mountPoint = document.createElement("div");
		this.page.main[0].appendChild(this.mountPoint);
		this.app = createApp(DSAPractice, { page: this.page });
		this.component = this.app.mount(this.mountPoint);
	}

	refresh() {
		this.component?.refresh?.();
	}

	dispose() {
		this.app?.unmount();
		this.app = null;
	}
}

window.dsa = { DSAPractice: DSAPracticePage };
