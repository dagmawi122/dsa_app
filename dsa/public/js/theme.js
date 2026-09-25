(function () {
	"use strict";

	if (window.dsaTheme) return; 

	var STORAGE_KEY = "dsa-theme";

	function getSystemTheme() {
		return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}

	function getStoredTheme() {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch (e) {
			return null;
		}
	}

	function storeTheme(theme) {
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch (e) {
			/* ignore */
		}
	}

	var currentTheme =
		getStoredTheme() === "light" || getStoredTheme() === "dark"
			? getStoredTheme()
			: getSystemTheme();

	function updateToggleButton() {
		var btn = document.getElementById("dsa-theme-toggle");
		if (!btn) return;
		btn.classList.toggle("is-dark", currentTheme === "dark");
		btn.setAttribute(
			"aria-label",
			currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
		);
		btn.setAttribute("aria-pressed", currentTheme === "dark" ? "true" : "false");
	}

	function applyTheme() {
		if (!document.body) return;
		document.body.setAttribute("data-theme", currentTheme);
		updateToggleButton();
		window.dispatchEvent(
			new CustomEvent("dsa-theme-change", { detail: { theme: currentTheme } })
		);
	}

	function setTheme(theme, persist) {
		currentTheme = theme;
		if (persist !== false) storeTheme(theme);
		applyTheme();
	}

	function toggleTheme() {
		setTheme(currentTheme === "dark" ? "light" : "dark");
	}

	function injectStyles() {
		if (document.getElementById("dsa-theme-toggle-styles")) return;

		var style = document.createElement("style");
		style.id = "dsa-theme-toggle-styles";
		style.textContent =
			"body.dsa-standalone-website, body.dsa-practice-website {" +
			"transition: background-color 0.25s ease, color 0.25s ease;" +
			"}" +
			".dsa-theme-toggle {" +
			"position: fixed; top: 16px; right: 16px; z-index: 10050;" +
			"width: 52px; height: 30px; padding: 0;" +
			"border: 1px solid var(--border-color, #d9d9d9);" +
			"border-radius: 999px; background: var(--control-bg, #f5f5f5);" +
			"cursor: pointer; display: flex; align-items: center;" +
			"box-shadow: 0 2px 8px rgba(0,0,0,0.1);" +
			"transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.15s ease;" +
			"}" +
			".dsa-theme-toggle:hover { border-color: var(--accent, #f5a800); transform: translateY(-1px); }" +
			".dsa-theme-toggle:active { transform: translateY(0) scale(0.96); }" +
			".dsa-theme-toggle:focus-visible { outline: 2px solid var(--accent, #f5a800); outline-offset: 3px; }" +
			".dsa-theme-toggle-track { position: relative; width: 100%; height: 100%; }" +
			".dsa-theme-toggle-thumb {" +
			"position: absolute; top: 2px; left: 2px; width: 24px; height: 24px;" +
			"border-radius: 50%; background: linear-gradient(135deg, #ffcd39, #f5a800);" +
			"color: #1a1400; display: flex; align-items: center; justify-content: center;" +
			"transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), background 0.4s ease, color 0.4s ease;" +
			"}" +
			".dsa-theme-toggle.is-dark .dsa-theme-toggle-thumb {" +
			"transform: translateX(22px) rotate(360deg);" +
			"background: linear-gradient(135deg, #4b5563, #1f2937); color: #f5d76e;" +
			"}" +
			".dsa-theme-toggle-thumb svg { position: absolute; width: 13px; height: 13px; transition: opacity 0.25s ease, transform 0.35s ease; }" +
			".dsa-theme-toggle-thumb .icon-moon { opacity: 0; transform: rotate(-70deg) scale(0.4); }" +
			".dsa-theme-toggle-thumb .icon-sun { opacity: 1; transform: rotate(0deg) scale(1); }" +
			".dsa-theme-toggle.is-dark .dsa-theme-toggle-thumb .icon-sun { opacity: 0; transform: rotate(70deg) scale(0.4); }" +
			".dsa-theme-toggle.is-dark .dsa-theme-toggle-thumb .icon-moon { opacity: 1; transform: rotate(0deg) scale(1); }" +
			"@media (max-width: 600px) { .dsa-theme-toggle { top: 10px; right: 10px; } }";
		document.head.appendChild(style);
	}

	function injectButton() {
		if (document.getElementById("dsa-theme-toggle")) {
			updateToggleButton();
			return;
		}

		var btn = document.createElement("button");
		btn.id = "dsa-theme-toggle";
		btn.type = "button";
		btn.className = "dsa-theme-toggle";
		btn.innerHTML =
			'<span class="dsa-theme-toggle-track">' +
			'<span class="dsa-theme-toggle-thumb">' +
			'<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
			'<circle cx="12" cy="12" r="4"/>' +
			'<path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>' +
			"</svg>" +
			'<svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor">' +
			'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5z"/>' +
			"</svg>" +
			"</span>" +
			"</span>";
		btn.addEventListener("click", toggleTheme);
		document.body.appendChild(btn);
		updateToggleButton();
	}

	var systemListenerAttached = false;

	function attachSystemListener() {
		if (systemListenerAttached || !window.matchMedia) return;
		systemListenerAttached = true;

		var mq = window.matchMedia("(prefers-color-scheme: dark)");
		var handler = function (e) {
			if (!getStoredTheme()) {
				setTheme(e.matches ? "dark" : "light", false);
			}
		};

		if (mq.addEventListener) mq.addEventListener("change", handler);
		else if (mq.addListener) mq.addListener(handler);
	}

	function init(opts) {
		opts = opts || {};
		injectStyles();
		if (!opts.hideToggle) {
			injectButton();
		}
		applyTheme();
		attachSystemListener();
	}

	window.dsaTheme = {
		get: function () { return currentTheme; },
		set: function (theme) { setTheme(theme); },
		toggle: toggleTheme,
		init: init,
	};

	if (document.body) {
		init();
	} else {
		document.addEventListener("DOMContentLoaded", function () { init(); });
	}

	window.dsaTheme = {
		get: function () { return currentTheme; },
		set: function (theme) { setTheme(theme); },
		toggle: toggleTheme,
		init: init,
	};

	if (document.body) {
		init();
	} else {
		document.addEventListener("DOMContentLoaded", init);
	}
})();