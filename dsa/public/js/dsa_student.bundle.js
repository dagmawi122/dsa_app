import { createApp } from "vue";
import DSAPractice from "./components/DSAPractice.vue";

frappe.ready(() => {
	const target = document.getElementById("dsa-student-editor");
	if (!target) return;
	const app = createApp(DSAPractice, {
		problemName: target.dataset.problem,
		embedded: target.dataset.embedded === "1",
		backUrl: target.dataset.backUrl,
	});
	app.mount(target);
	window.addEventListener("pagehide", () => app.unmount(), { once: true });
});
