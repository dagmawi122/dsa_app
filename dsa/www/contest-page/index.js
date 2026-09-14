document.body.classList.add("dsa-standalone-website");

const script = document.createElement("script");
script.src = "/assets/dsa/js/contest_page.js";

script.onload = function () {
	console.log("ContestPage JS loaded");

	const root = document.getElementById("contest-page-root");

	if (!root) {
		console.error("contest-page-root not found");
		return;
	}

	const path = window.location.pathname;
	const parts = path.split("/").filter(Boolean);

	const contest_name =
		parts[0] === "contest-page" ? parts[1] : null;

	new window.ContestPage(root, contest_name);
};

script.onerror = function () {
	console.error("Failed to load contest_page.js");
};

document.head.appendChild(script);
