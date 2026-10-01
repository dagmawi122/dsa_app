document.body.classList.add("dsa-standalone-website");

const script = document.createElement("script");
script.src = "/assets/dsa/js/leaderboard.js";

script.onload = function () {
    console.log("LeaderboardPage JS loaded");

    const root = document.getElementById("leaderboard-page-root");

    if (!root) {
        console.error("leaderboard-page-root not found");
        return;
    }

    new window.LeaderboardPage(root);
};

script.onerror = function () {
    console.error("Failed to load leaderboard.js");
};

document.head.appendChild(script);