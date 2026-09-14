import { createApp } from "vue";
import DSAPractice from "./components/DSAPractice.vue";
import ProblemList from "./components/ProblemList.vue";

function syncPracticeLayout() {
	if (!frappe.router) {
		return;
	}

	const route = frappe.get_route();
	document.body.classList.toggle(
		"dsa-focus-mode",
		route[0] === "dsa-practice" && !!route[1]
	);
}

if (frappe.router) {
	frappe.router.on("change", syncPracticeLayout);
}

syncPracticeLayout();

class DSAPracticePage {
	constructor(wrapper, problemSlug = null) {
		wrapper.classList.add("dsa-editor-page");

		if (frappe.ui?.make_app_page) {
			// Desk
			this.page = frappe.ui.make_app_page({
				parent: wrapper,
				title: __("DSA Practice"),
				single_column: true,
			});

			this.page.main.closest(".container").addClass("dsa-page-container");

			this.mountPoint = document.createElement("div");
			this.page.main[0].appendChild(this.mountPoint);

			this.problemSlug = problemSlug || frappe.get_route()[1];
		} else {
			// Website
			this.mountPoint = document.createElement("div");
			wrapper.appendChild(this.mountPoint);

			this.problemSlug = problemSlug;
		}

		this.refresh();
	}

	refresh() {
		const slug = this.problemSlug;

		if (!slug) {
			window.location.href = "/list-problems";
			return;
		}

		if (slug !== this.currentProblemSlug) {
			this.dispose();

			this.currentProblemSlug = slug;

			this.app = createApp(DSAPractice, {
				page: this.page,
				problemSlug: slug,
			});

			this.component = this.app.mount(this.mountPoint);
			return;
		}

		this.component?.refresh?.();
	}

	dispose() {
		this.app?.unmount();
		this.app = null;
	}
}

class ProblemListPage {
	constructor(wrapper) {
		wrapper.classList.add("dsa-catalog-page");

		if (frappe.ui?.make_app_page) {
			// Desk
			this.page = frappe.ui.make_app_page({
				parent: wrapper,
				title: __("Practice Problems"),
				single_column: true,
			});

			this.mountPoint = document.createElement("div");
			this.page.main[0].appendChild(this.mountPoint);
		} else {
			// Website
			this.mountPoint = document.createElement("div");
			wrapper.appendChild(this.mountPoint);
		}

		this.app = createApp(ProblemList);
		this.component = this.app.mount(this.mountPoint);
	}

	refresh() {
		this.component?.refresh?.();
	}
}

class ContestProblemPage {
	constructor(wrapper, contestName = null, problemName = null) {
		this.wrapper = wrapper;

		if (frappe.ui?.make_app_page) {
			// Desk
			const route = frappe.get_route();

			this.contestName = contestName || route[1];
			this.problemName = problemName || route[2];

			this.page = frappe.ui.make_app_page({
				parent: wrapper,
				title: __("Contest Problem"),
				single_column: true,
			});

			this.page.main.closest(".container").addClass("dsa-page-container");

			this.mountPoint = document.createElement("div");
			this.page.main[0].appendChild(this.mountPoint);
		} else {
			// Website
			this.contestName = contestName;
			this.problemName = problemName;

			this.mountPoint = document.createElement("div");
			wrapper.appendChild(this.mountPoint);
		}

		this.app = createApp(DSAPractice, {
			page: this.page,
			contestMode: true,
			contestName: this.contestName,
			problemName: this.problemName,
			standalone: !this.page,
		});

		this.component = this.app.mount(this.mountPoint);
	}

	refresh() {
		if (frappe.ui?.make_app_page) {
			const route = frappe.get_route();
			const currentContest = route[1];
			const currentProblem = route[2];

			if (
				currentProblem &&
				(
					currentProblem !== this.problemName ||
					currentContest !== this.contestName
				)
			) {
				this.contestName = currentContest;
				this.problemName = currentProblem;

				this.component?.setContestProblem?.(
					currentContest,
					currentProblem
				);
			} else {
				this.component?.refresh?.();
			}
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
	ProblemList: ProblemListPage,
	DSAPractice: DSAPracticePage,
	ContestProblem: ContestProblemPage,
};
