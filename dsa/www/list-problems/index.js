document.body.classList.add("dsa-standalone-website");

frappe.require("dsa.bundle.js").then(() => {
	console.log("DSA bundle loaded");

	const root = document.getElementById("list-problems-root");

	if (!root) {
		console.error("list-problems-root not found");
		return;
	}

	console.log("ProblemList:", window.dsa?.ProblemList);

	new window.dsa.ProblemList(root);
});