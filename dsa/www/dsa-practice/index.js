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

	const pathSegments = window.location.pathname.split("/").filter(Boolean);
	const lastSegment = pathSegments.pop();
	const urlParams = new URLSearchParams(window.location.search);
	const queryProblem = urlParams.get("problem");
	const problemName = (lastSegment && lastSegment !== "dsa-practice") ? lastSegment : queryProblem;

	new window.dsa.DSAPractice(root, decodeURIComponent(problemName || ""));
});
