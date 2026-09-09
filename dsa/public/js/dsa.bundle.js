import { createApp } from "vue";
import DSAPractice from "./components/DSAPractice.vue";
import ProblemList from "./components/ProblemList.vue";

// Scope the distraction-free layout to problem routes; leaving restores Desk.
function syncPracticeLayout() {
	const route = frappe.get_route();
	document.body.classList.toggle("dsa-focus-mode", route[0] === "dsa-practice" && !!route[1]);
}
frappe.router.on("change", syncPracticeLayout);
syncPracticeLayout();

class DSAPracticePage {
	constructor(wrapper) {
		wrapper.classList.add("dsa-editor-page");
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("DSA Practice"),
			single_column: true,
		});

		this.page.main.closest(".container").addClass("dsa-page-container");

		this.mountPoint = document.createElement("div");
		this.page.main[0].appendChild(this.mountPoint);

		this.refresh();
	}

	refresh() {
		const slug = frappe.get_route()[1];
		if (!slug) {
			frappe.set_route("list-problems");
			return;
		}
		if (slug !== this.problemSlug) {
			this.dispose();
			this.problemSlug = slug;
			this.page.set_title(__("DSA Practice"));
			this.app = createApp(DSAPractice, { page: this.page, problemSlug: slug });
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
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Practice Problems"),
			single_column: true,
		});
		this.mountPoint = document.createElement("div");
		this.page.main[0].appendChild(this.mountPoint);
		this.app = createApp(ProblemList);
		this.component = this.app.mount(this.mountPoint);
	}

	refresh() {
		this.component?.refresh?.();
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

		if (!currentContest) {
			frappe.set_route("contest-page");
			return;
		}

		if (!currentProblem) {
			frappe.set_route("contest-comp", currentContest);
			return;
		}

		if (
			currentProblem &&
			(currentProblem !== this.problemName || currentContest !== this.contestName)
		) {
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
	ProblemList: ProblemListPage,
	DSAPractice: DSAPracticePage,
	ContestProblem: ContestProblemPage,
};
