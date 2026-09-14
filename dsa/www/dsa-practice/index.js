document.body.classList.add("dsa-practice-website");
document.body.classList.add("dsa-standalone-website");

frappe.require("dsa.bundle.js").then(() => {
	console.log("DSA bundle loaded");

	const root = document.getElementById("dsa-practice-root");

	if (!root) {
		console.error("dsa-practice-root not found");
		return;
	}

	console.log("DSAPractice:", window.dsa?.DSAPractice);

	const problemName = window.location.pathname.split("/").filter(Boolean).pop();

	new window.dsa.DSAPractice(root, decodeURIComponent(problemName));
});
