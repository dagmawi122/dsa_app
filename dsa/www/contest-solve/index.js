document.body.classList.add("contest-solve-website");
document.body.classList.add("dsa-standalone-website");

frappe.require("dsa.bundle.js").then(() => {
	const root = document.getElementById("contest-solve-root");

	if (!root) {
		console.error("contest-solve-root not found");
		return;
	}

	const parts = window.location.pathname.split("/").filter(Boolean);

	const contestName = decodeURIComponent(parts[1] || "");
	const problemName = decodeURIComponent(parts[2] || "");

	console.log("Contest:", contestName);
	console.log("Problem:", problemName);

	new window.dsa.ContestProblem(
		root,
		contestName,
		problemName
	);
});

