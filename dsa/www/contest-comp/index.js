document.body.classList.add("dsa-standalone-website");

const script = document.createElement("script");
script.src = "/assets/dsa/js/contest_comp.js";

script.onload = function () {
    console.log("ContestComp JS loaded");

    const root = document.getElementById("contest-comp-root");

    if (!root) {
        console.error("contest-comp-root not found");
        return;
    }

    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);

    const contest_name =
        parts[0] === "contest-comp" ? parts[1] : null;

    new window.ContestComp(root, contest_name);
};

script.onerror = function () {
    console.error("Failed to load contest_comp.js");
};

document.head.appendChild(script);

