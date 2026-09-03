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

		this.app = createApp(DSAPractice, {
			page: this.page,
		});

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

class ContestProblemPage {
	constructor(wrapper) {
		const route = frappe.get_route();

		this.contestName = route[1];
		this.problemName = route[2];

		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Contest Problem"),
			single_column: true,
		});

		this.page.main.closest(".container").addClass("dsa-page-container");

		this.mountPoint = document.createElement("div");
		this.page.main[0].appendChild(this.mountPoint);

		this.app = createApp(DSAPractice, {
			page: this.page,
			contestMode: true,
			contestName: this.contestName,
			problemName: this.problemName,
		});

		this.component = this.app.mount(this.mountPoint);
	}

	refresh() {
		const route = frappe.get_route();
		const currentContest = route[1];
		const currentProblem = route[2];

		if (currentProblem && (currentProblem !== this.problemName || currentContest !== this.contestName)) {
			this.contestName = currentContest;
			this.problemName = currentProblem;
			this.component?.setContestProblem?.(currentContest, currentProblem);
		} else {
			this.component?.refresh?.();
		}
	}

	dispose() {
		this.app?.unmount();
		this.app = null;
	}
}

window.dsa = {
	DSAPractice: DSAPracticePage,
	ContestProblem: ContestProblemPage,
};
