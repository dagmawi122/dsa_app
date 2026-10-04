class LeaderboardPage {
	constructor(wrapper) {
		this.wrapper = wrapper;

		this.tab = "xp";
		this.contests = null;
		this.counts = null;
		this.contest_filter = null;
		this.selected_contest = null;
		this.view_token = 0;

		this.add_styles();
		this.render();
		this.show_tab("xp");
	}

	add_styles() {

		if (window.dsaTheme) window.dsaTheme.init();

		if ($("#dsa-leaderboard-styles").length) {
			return;
		}

		$("head").append(`
			<style id="dsa-leaderboard-styles">

				body.dsa-standalone-website {
					--bg-color: #ffffff;
					--card-bg: #ffffff;
					--control-bg: #f5f5f5;
					--fg-hover-color: #eeeeee;
					--border-color: #d9d9d9;

					--text-color: #222222;
					--heading-color: #181818;
					--text-muted: #777777;

					--accent: #f5a800;
					--accent-2: #ffcd39;
					--accent-ink: #1a1400;

					--accent-soft: rgba(245, 168, 0, 0.13);
					--accent-soft-strong: rgba(245, 168, 0, 0.22);

					--green: #16803c;
					--green-2: #34b86f;
					--green-soft: rgba(22, 128, 60, 0.13);

					--red: #dc2626;
					--red-soft: rgba(220, 38, 38, 0.10);

					--blue: #2563eb;
					--blue-soft: rgba(37, 99, 235, 0.12);

					--silver: #9aa3ad;
					--bronze: #c97b3d;

					--card-shadow:
						0 1px 2px rgba(15, 15, 15, 0.04),
						0 8px 24px rgba(15, 15, 15, 0.05);

					--card-shadow-hover:
						0 2px 4px rgba(15, 15, 15, 0.06),
						0 16px 36px rgba(15, 15, 15, 0.09);

					color: var(--text-color);
					background: var(--bg-color);
				}


				/* =========================================================
				DARK THEME
				========================================================= */

				@media (prefers-color-scheme: dark) {
					body.dsa-standalone-website:not([data-theme="light"]) {
						--bg-color: #161616;
						--card-bg: #1e1e1e;
						--control-bg: #252525;
						--fg-hover-color: #303030;
						--border-color: #3a3a3a;

						--text-color: #e6e6e6;
						--heading-color: #f0f0f0;
						--text-muted: #999999;

						--accent: #f5b82e;
						--accent-2: #ffd45c;
						--accent-ink: #181200;

						--accent-soft: rgba(245, 184, 46, 0.14);
						--accent-soft-strong: rgba(245, 184, 46, 0.23);

						--green: #5fd68a;
						--green-2: #7be3a1;
						--green-soft: rgba(95, 214, 138, 0.13);

						--red: #ff6b6b;
						--red-soft: rgba(255, 107, 107, 0.12);

						--blue: #6ea8fe;
						--blue-soft: rgba(110, 168, 254, 0.14);

						--silver: #aeb5bd;
						--bronze: #d8955b;

						--card-shadow:
							0 1px 2px rgba(0, 0, 0, 0.25),
							0 8px 24px rgba(0, 0, 0, 0.20);

						--card-shadow-hover:
							0 2px 4px rgba(0, 0, 0, 0.30),
							0 16px 36px rgba(0, 0, 0, 0.30);
					}
				}


				body.dsa-standalone-website[data-theme="dark"] {
					--bg-color: #161616;
					--card-bg: #1e1e1e;
					--control-bg: #252525;
					--fg-hover-color: #303030;
					--border-color: #3a3a3a;

					--text-color: #e6e6e6;
					--heading-color: #f0f0f0;
					--text-muted: #999999;

					--accent: #f5b82e;
					--accent-2: #ffd45c;
					--accent-ink: #181200;

					--accent-soft: rgba(245, 184, 46, 0.14);
					--accent-soft-strong: rgba(245, 184, 46, 0.23);

					--green: #5fd68a;
					--green-2: #7be3a1;
					--green-soft: rgba(95, 214, 138, 0.13);

					--red: #ff6b6b;
					--red-soft: rgba(255, 107, 107, 0.12);

					--blue: #6ea8fe;
					--blue-soft: rgba(110, 168, 254, 0.14);

					--silver: #aeb5bd;
					--bronze: #d8955b;

					--card-shadow:
						0 1px 2px rgba(0, 0, 0, 0.25),
						0 8px 24px rgba(0, 0, 0, 0.20);

					--card-shadow-hover:
						0 2px 4px rgba(0, 0, 0, 0.30),
						0 16px 36px rgba(0, 0, 0, 0.30);
				}


				/* =========================================================
				STANDALONE PAGE CHROME
				========================================================= */

				body.dsa-standalone-website #page-index,
				body.dsa-standalone-website .page-content-wrapper,
				body.dsa-standalone-website main.container,
				body.dsa-standalone-website .layout-main-section,
				body.dsa-standalone-website .layout-main-section-wrapper,
				body.dsa-standalone-website .page-container {
					background: var(--bg-color) !important;
					border: 0 !important;
					box-shadow: none !important;
					outline: none !important;
				}

				body.dsa-standalone-website > main.container {
					width: 100% !important;
					max-width: none !important;
					padding-left: 0 !important;
					padding-right: 0 !important;
				}

				body.dsa-standalone-website #page-index {
					margin: 0 !important;
					padding: 0 !important;
					width: 100% !important;
					max-width: none !important;
				}

				body.dsa-standalone-website {
					margin: 0 !important;
					padding: 0 !important;
					overflow-x: hidden !important;
				}


				/* =========================================================
				LEADERBOARD PAGE
				========================================================= */

				.leaderboard-page {
					position: relative;
					min-height: 100vh;
					padding: 30px;
					max-width: 1200px;
					margin: 0 auto;

					color: var(--text-color);

					font-family:
						var(--font-stack,
						-apple-system,
						BlinkMacSystemFont,
						'Segoe UI',
						Roboto,
						sans-serif);

					background:
						radial-gradient(
							720px 320px at 12% -8%,
							var(--accent-soft),
							transparent 60%
						),
						radial-gradient(
							600px 280px at 100% 0%,
							var(--green-soft),
							transparent 55%
						),
						var(--bg-color);
				}

				.leaderboard-page *,
				.leaderboard-page *::before,
				.leaderboard-page *::after {
					box-sizing: border-box;
				}

				.leaderboard-page button {
					font-family: inherit;
				}

				.back-to-home {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					background: transparent;
					border: 0;
					color: var(--text-muted);
					padding: 6px 2px;
					margin-bottom: 10px;
					cursor: pointer;
					font-size: 12px;
					font-weight: 600;
					transition: color 0.2s ease, transform 0.2s ease;
				}

				.back-to-home:hover {
					color: var(--accent);
					transform: translateX(-2px);
				}

				.back-to-home .inline-icon {
					color: currentColor;
				}


				/* =========================================================
				HEADER
				========================================================= */

				.leaderboard-header {
					position: relative;

					display: flex;
					align-items: center;
					gap: 20px;

					padding: 32px 36px;
					margin-bottom: 24px;

					border-radius: 18px;

					background:
						linear-gradient(
							155deg,
							var(--card-bg) 0%,
							var(--card-bg) 60%,
							var(--accent-soft) 170%
						);

					border: 1px solid var(--border-color);
					box-shadow: var(--card-shadow);

					overflow: hidden;
				}

				.leaderboard-header::before {
					content: "";

					position: absolute;
					inset: 0;

					background-image:
						radial-gradient(
							var(--border-color) 1px,
							transparent 1px
						);

					background-size: 22px 22px;

					-webkit-mask-image:
						linear-gradient(
							155deg,
							rgba(0,0,0,0.5),
							transparent 65%
						);

					mask-image:
						linear-gradient(
							155deg,
							rgba(0,0,0,0.5),
							transparent 65%
						);

					opacity: 0.5;
					pointer-events: none;
				}

				.leaderboard-header-icon {
					position: relative;
					z-index: 1;

					flex-shrink: 0;

					width: 56px;
					height: 56px;

					border-radius: 14px;

					display: flex;
					align-items: center;
					justify-content: center;

					font-size: 26px;

					background:
						linear-gradient(
							155deg,
							var(--accent-2),
							var(--accent)
						);

					box-shadow:
						0 8px 20px var(--accent-soft-strong);
				}

				.leaderboard-header-text {
					position: relative;
					z-index: 1;
				}

				.leaderboard-header h1 {
					margin: 0 0 6px;

					font-size: 28px;
					font-weight: 800;

					letter-spacing: -0.4px;

					color: var(--heading-color);
				}

				.leaderboard-header p {
					margin: 0;

					color: var(--text-muted);
					font-size: 14px;
				}


				/* =========================================================
				MAIN TABS
				========================================================= */

				.lb-tabs {
					display: inline-flex;
					gap: 4px;
					padding: 4px;
					margin-bottom: 24px;
					max-width: 100%;

					background: var(--control-bg);
					border: 1px solid var(--border-color);
					border-radius: 12px;
				}

				.lb-tab {
					display: inline-flex;
					align-items: center;
					gap: 8px;

					padding: 9px 18px;

					border: 1px solid transparent;
					border-radius: 9px;
					background: transparent;

					color: var(--text-muted);
					font-size: 14px;
					font-weight: 600;
					white-space: nowrap;
					cursor: pointer;

					transition:
						color 0.15s ease,
						background 0.15s ease,
						box-shadow 0.15s ease;
				}

				.lb-tab:hover {
					color: var(--heading-color);
				}

				.lb-tab[aria-selected="true"] {
					background: var(--card-bg);
					border-color: var(--border-color);
					color: var(--heading-color);
					box-shadow: var(--card-shadow);
				}

				.lb-tab:focus-visible,
				.lb-seg-btn:focus-visible,
				.lb-contest-card:focus-visible,
				.lb-btn:focus-visible,
				.lb-back:focus-visible,
				.back-to-home:focus-visible {
					outline: 2px solid var(--accent);
					outline-offset: 2px;
				}


				/* =========================================================
				SECTION HEAD / CHIPS / SEGMENT
				========================================================= */

				.lb-fade {
					animation: lb-fade-up 0.35s ease both;
				}

				.lb-section-head {
					display: flex;
					align-items: flex-end;
					justify-content: space-between;
					flex-wrap: wrap;
					gap: 12px;

					margin-bottom: 20px;
				}

				.lb-section-head h2 {
					margin: 0 0 4px;

					font-size: 20px;
					font-weight: 800;
					letter-spacing: -0.2px;

					color: var(--heading-color);
				}

				.lb-section-head p {
					margin: 0;

					font-size: 13px;
					color: var(--text-muted);
				}

				.lb-chips {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 8px;
				}

				.lb-chip {
					display: inline-flex;
					align-items: center;
					gap: 6px;

					padding: 5px 12px;

					border-radius: 999px;
					border: 1px solid var(--border-color);
					background: var(--card-bg);

					font-size: 12px;
					font-weight: 600;
					color: var(--text-muted);
				}

				.lb-chip--active {
					background: var(--accent-soft);
					border-color: transparent;
					color: var(--accent);
				}

				.lb-segment {
					display: inline-flex;
					gap: 4px;
					padding: 3px;

					background: var(--control-bg);
					border: 1px solid var(--border-color);
					border-radius: 10px;
				}

				.lb-seg-btn {
					display: inline-flex;
					align-items: center;
					gap: 8px;

					padding: 7px 14px;

					border: 0;
					border-radius: 7px;
					background: transparent;

					color: var(--text-muted);
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;

					transition: background 0.15s ease, color 0.15s ease;
				}

				.lb-seg-btn:hover {
					color: var(--heading-color);
				}

				.lb-seg-btn[aria-pressed="true"] {
					background: var(--card-bg);
					color: var(--heading-color);
					box-shadow: var(--card-shadow);
				}

				.lb-seg-count {
					min-width: 20px;
					padding: 1px 6px;

					border-radius: 999px;
					background: var(--accent-soft);
					color: var(--accent);

					font-size: 11px;
					font-weight: 700;
					text-align: center;
				}


				/* =========================================================
				PODIUM
				========================================================= */

				.lb-podium {
					display: flex;
					align-items: flex-end;
					justify-content: center;
					gap: 16px;

					margin-bottom: 24px;
				}

				.lb-podium-card {
					position: relative;

					flex: 1 1 0;
					min-width: 0;
					max-width: 300px;

					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 6px;

					padding: 24px 16px 22px;

					text-align: center;

					background: var(--card-bg);
					border: 1px solid var(--border-color);
					border-radius: 16px;
					box-shadow: var(--card-shadow);

					transition:
						transform 0.2s ease,
						box-shadow 0.2s ease;
				}

				.lb-podium-card:hover {
					transform: translateY(-3px);
					box-shadow: var(--card-shadow-hover);
				}

				.lb-podium-card.place-1 {
					flex-grow: 1.18;
					padding: 36px 18px 32px;

					border-color: var(--accent);

					background:
						linear-gradient(
							180deg,
							var(--accent-soft),
							transparent 75%
						),
						var(--card-bg);

					box-shadow: var(--card-shadow-hover);
				}

				.lb-podium-card.is-me {
					outline: 2px solid var(--accent);
					outline-offset: 2px;
				}

				.lb-medal {
					width: 28px;
					height: 28px;

					display: grid;
					place-items: center;

					border-radius: 50%;
					border: 2px solid var(--silver);
					background: var(--card-bg);
					color: var(--silver);

					font-size: 13px;
					font-weight: 800;
				}

				.place-1 .lb-medal {
					width: 32px;
					height: 32px;

					border-color: transparent;
					background: linear-gradient(135deg, var(--accent-2), var(--accent));
					color: var(--accent-ink);

					box-shadow: 0 4px 12px var(--accent-soft-strong);
				}

				.place-3 .lb-medal {
					border-color: var(--bronze);
					color: var(--bronze);
				}

				.lb-avatar {
					flex-shrink: 0;

					display: grid;
					place-items: center;

					width: 36px;
					height: 36px;

					border-radius: 50%;
					border: 2px solid var(--border-color);
					background: var(--accent-soft);
					color: var(--accent);

					font-size: 13px;
					font-weight: 700;

					overflow: hidden;
				}

				.lb-avatar img {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}

				.lb-avatar--lg {
					width: 56px;
					height: 56px;
					font-size: 18px;
				}

				.place-1 .lb-avatar--lg {
					width: 72px;
					height: 72px;
					font-size: 24px;
				}

				.place-1 .lb-avatar { border-color: var(--accent); }
				.place-2 .lb-avatar { border-color: var(--silver); }
				.place-3 .lb-avatar { border-color: var(--bronze); }

				.lb-podium-name {
					max-width: 100%;
					margin-top: 4px;

					font-size: 15px;
					font-weight: 700;
					color: var(--heading-color);

					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.lb-podium-value {
					font-size: 22px;
					font-weight: 800;
					letter-spacing: -0.3px;
					color: var(--heading-color);

					font-variant-numeric: tabular-nums;
				}

				.place-1 .lb-podium-value {
					font-size: 28px;
					color: var(--accent);
				}

				.lb-podium-value small {
					margin-left: 3px;

					font-size: 12px;
					font-weight: 600;
					color: var(--text-muted);
					letter-spacing: 0;
				}

				.lb-podium-sub {
					font-size: 12px;
					color: var(--text-muted);
				}


				/* =========================================================
				RANKING LIST
				========================================================= */

				.lb-list {
					background: var(--card-bg);
					border: 1px solid var(--border-color);
					border-radius: 14px;
					box-shadow: var(--card-shadow);

					overflow: hidden;
				}

				.lb-row {
					display: grid;
					align-items: center;
					gap: 12px;

					padding: 12px 18px;

					border-bottom: 1px solid var(--border-color);

					font-size: 14px;

					transition: background 0.15s ease;
				}

				.lb-row:last-child {
					border-bottom: 0;
				}

				.lb-row--head {
					padding-top: 10px;
					padding-bottom: 10px;

					background: var(--control-bg);

					font-size: 11px;
					font-weight: 600;
					letter-spacing: 0.06em;
					text-transform: uppercase;
					color: var(--text-muted);
				}

				.lb-row:not(.lb-row--head):hover {
					background: var(--fg-hover-color);
				}

				.lb-row.is-me {
					background: var(--accent-soft);
					box-shadow: inset 3px 0 0 var(--accent);
				}

				.lb-list--xp .lb-row {
					grid-template-columns: 64px minmax(0, 1fr) auto;
				}

				.lb-list--contest .lb-row {
					grid-template-columns: 64px minmax(0, 1fr) 90px 80px 110px 110px;
				}

				.lb-rank {
					display: inline-flex;
					align-items: center;
					justify-content: center;

					min-width: 40px;
					height: 28px;
					padding: 0 8px;

					border-radius: 8px;

					background: var(--accent-soft);
					color: var(--accent);

					font-size: 13px;
					font-weight: 700;
				}

				.lb-user {
					display: flex;
					align-items: center;
					gap: 12px;
					min-width: 0;
				}

				.lb-user-name {
					font-weight: 600;
					color: var(--text-color);

					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.lb-you {
					flex-shrink: 0;

					padding: 2px 8px;

					border-radius: 999px;
					background: var(--accent);
					color: var(--accent-ink);

					font-size: 10px;
					font-weight: 800;
					letter-spacing: 0.04em;
					text-transform: uppercase;
				}

				.lb-num {
					text-align: right;
					font-variant-numeric: tabular-nums;
				}

				.lb-score {
					font-size: 15px;
					font-weight: 700;
					color: var(--accent);
				}

				.lb-muted {
					color: var(--text-muted);
				}


				/* =========================================================
				CURRENT USER BAR
				========================================================= */

				.lb-me-bar {
					position: sticky;
					bottom: 16px;
					z-index: 5;

					display: flex;
					align-items: center;
					gap: 14px;

					margin-top: 18px;
					padding: 12px 16px;

					background: var(--card-bg);
					border: 1px solid var(--accent);
					border-radius: 14px;
					box-shadow: var(--card-shadow-hover);
				}

				.lb-me-bar .lb-user {
					flex: 1;
				}

				.lb-me-bar-label {
					font-size: 11px;
					font-weight: 600;
					letter-spacing: 0.06em;
					text-transform: uppercase;
					color: var(--text-muted);
				}


				/* =========================================================
				CONTEST CARDS
				========================================================= */

				.lb-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
					gap: 16px;
				}

				.lb-contest-card {
					display: flex;
					flex-direction: column;
					gap: 14px;

					width: 100%;
					padding: 20px;

					text-align: left;
					color: var(--text-color);

					background: var(--card-bg);
					border: 1px solid var(--border-color);
					border-radius: 16px;
					box-shadow: var(--card-shadow);

					cursor: pointer;

					transition:
						transform 0.2s ease,
						box-shadow 0.2s ease,
						border-color 0.2s ease;
				}

				.lb-contest-card:hover {
					transform: translateY(-3px);
					border-color: var(--accent);
					box-shadow: var(--card-shadow-hover);
				}

				.lb-contest-card.phase-live {
					border-color: var(--green);
				}

				.lb-contest-top {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 10px;
				}

				.lb-contest-title {
					margin: 0;

					font-size: 17px;
					font-weight: 700;
					line-height: 1.3;
					color: var(--heading-color);

					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}

				.lb-meta {
					display: flex;
					flex-direction: column;
					gap: 6px;

					font-size: 13px;
					color: var(--text-muted);
				}

				.lb-meta-line {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.lb-meta-line .inline-icon {
					display: inline-flex;
					color: var(--text-muted);
				}

				.lb-view {
					display: inline-flex;
					align-items: center;
					justify-content: flex-end;
					gap: 6px;

					margin-top: auto;

					font-size: 13px;
					font-weight: 700;
					color: var(--accent);

					transition: gap 0.2s ease;
				}

				.lb-contest-card:hover .lb-view {
					gap: 10px;
				}

				.lb-badge {
					display: inline-flex;
					align-items: center;
					gap: 6px;

					padding: 3px 10px;

					border-radius: 999px;

					font-size: 11px;
					font-weight: 700;
					letter-spacing: 0.04em;
					text-transform: uppercase;
				}

				.lb-badge--live {
					background: var(--green-soft);
					color: var(--green);
				}

				.lb-badge--live::before {
					content: "";

					width: 6px;
					height: 6px;

					border-radius: 50%;
					background: var(--green);

					animation: lb-pulse 1.6s ease-in-out infinite;
				}

				.lb-badge--upcoming {
					background: var(--blue-soft);
					color: var(--blue);
				}

				.lb-badge--past {
					background: var(--control-bg);
					color: var(--text-muted);
				}


				/* =========================================================
				CONTEST DETAIL
				========================================================= */

				.lb-back {
					display: inline-flex;
					align-items: center;
					gap: 8px;

					margin-bottom: 14px;
					padding: 6px 2px;

					background: transparent;
					border: 0;

					color: var(--text-muted);
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;

					transition: color 0.2s ease, transform 0.2s ease;
				}

				.lb-back:hover {
					color: var(--accent);
					transform: translateX(-2px);
				}

				.lb-detail-head {
					margin-bottom: 22px;
				}

				.lb-detail-head h2 {
					margin: 0 0 10px;

					font-size: 24px;
					font-weight: 800;
					letter-spacing: -0.3px;
					color: var(--heading-color);
				}


				/* =========================================================
				BUTTON
				========================================================= */

				.lb-btn {
					margin-top: 8px;
					padding: 8px 16px;

					border: 1px solid var(--border-color);
					border-radius: 9px;
					background: var(--control-bg);

					color: var(--text-color);
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;

					transition: border-color 0.15s ease, color 0.15s ease;
				}

				.lb-btn:hover {
					border-color: var(--accent);
					color: var(--accent);
				}


				/* =========================================================
				PLACEHOLDER / LOADING
				========================================================= */

				.leaderboard-placeholder,
				.leaderboard-loading {
					display: flex;

					flex-direction: column;
					align-items: center;
					justify-content: center;

					gap: 10px;

					padding: 70px 20px;

					text-align: center;

					color: var(--text-muted);

					background: var(--card-bg);

					border:
						1px dashed var(--border-color);

					border-radius: 14px;
				}

				.leaderboard-placeholder .placeholder-icon {
					font-size: 30px;
					margin-bottom: 4px;
				}

				.leaderboard-placeholder h3,
				.leaderboard-loading h3 {
					margin: 0;

					font-size: 16px;
					font-weight: 700;

					color: var(--heading-color);
				}

				.leaderboard-placeholder p,
				.leaderboard-loading span {
					margin: 0;

					font-size: 13px;

					color: var(--text-muted);
				}

				.leaderboard-loading .loading-spinner {
					width: 26px;
					height: 26px;

					border:
						3px solid var(--border-color);

					border-top-color: var(--accent);

					border-radius: 50%;

					animation:
						leaderboard-spin 0.8s linear infinite;

					margin-bottom: 4px;
				}


				/* =========================================================
				ANIMATION
				========================================================= */

				@keyframes leaderboard-spin {
					to {
						transform: rotate(360deg);
					}
				}

				@keyframes lb-fade-up {
					from {
						opacity: 0;
						transform: translateY(8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes lb-pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.35; }
				}

				@media (prefers-reduced-motion: reduce) {
					.lb-fade,
					.lb-badge--live::before,
					.leaderboard-loading .loading-spinner {
						animation: none;
					}

					.lb-podium-card,
					.lb-contest-card,
					.lb-tab,
					.lb-row {
						transition: none;
					}

					.lb-podium-card:hover,
					.lb-contest-card:hover {
						transform: none;
					}
				}


				/* =========================================================
				MOBILE
				========================================================= */

				@media (max-width: 720px) {
					.lb-list--contest .lb-row {
						grid-template-columns: 56px minmax(0, 1fr) auto;
					}

					.lb-list--contest .lb-extra {
						display: none;
					}
				}

				@media (max-width: 600px) {
					.leaderboard-page {
						padding: 20px 16px;
					}

					.leaderboard-header {
						flex-direction: column;
						align-items: flex-start;

						padding: 24px 22px;
					}

					.lb-tabs {
						display: flex;
						width: 100%;
					}

					.lb-tab {
						flex: 1;
						justify-content: center;
						padding: 9px 10px;
						font-size: 13px;
					}

					.lb-podium {
						gap: 8px;
					}

					.lb-podium-card,
					.lb-podium-card.place-1 {
						padding: 16px 8px 14px;
					}

					.place-1 .lb-avatar--lg,
					.lb-avatar--lg {
						width: 44px;
						height: 44px;
						font-size: 15px;
					}

					.lb-podium-name {
						font-size: 12px;
					}

					.lb-podium-value,
					.place-1 .lb-podium-value {
						font-size: 16px;
					}

					.lb-row {
						padding: 10px 12px;
					}
				}

			</style>
		`);
	}

	/* =========================================================
	SHELL
	========================================================= */

	render() {
		$(this.wrapper).html(`
			<div class="leaderboard-page">
				<button class="back-to-home">
					${this.icon("home")}
					<span>Back to Home</span>
				</button>

				<div class="leaderboard-header">
					<div class="leaderboard-header-icon">🏆</div>
					<div class="leaderboard-header-text">
						<h1>Leaderboard</h1>
						<p>Compete, learn, and climb the rankings.</p>
					</div>
				</div>

				<div class="lb-tabs" role="tablist" aria-label="Leaderboard sections">
					<button class="lb-tab" role="tab" id="lb-tab-xp"
						data-tab="xp" aria-selected="true" aria-controls="lb-panel">
						<span aria-hidden="true">🏆</span> XP Leaderboard
					</button>
					<button class="lb-tab" role="tab" id="lb-tab-contests"
						data-tab="contests" aria-selected="false" aria-controls="lb-panel" tabindex="-1">
						<span aria-hidden="true">⚔</span> Contest Leaderboards
					</button>
				</div>

				<div class="leaderboard-content" id="lb-panel" role="tabpanel" aria-live="polite"></div>
			</div>
		`);

		const page = $(this.wrapper).find(".leaderboard-page");

		page.find(".back-to-home").on("click", () => {
			window.location.href = "/lms";
		});

		page.find(".lb-tab").on("click", (event) => {
			this.show_tab($(event.currentTarget).data("tab"));
		});

		// Arrow-key navigation between the two main tabs.
		page.find(".lb-tabs").on("keydown", (event) => {
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

			event.preventDefault();
			const next = this.tab === "xp" ? "contests" : "xp";
			this.show_tab(next);
			page.find(`#lb-tab-${next}`).trigger("focus");
		});

		// One delegated handler for every in-content action.
		page.on("click", "[data-action]", (event) => {
			const el = $(event.currentTarget);
			const action = el.data("action");

			if (action === "retry-xp") this.load_xp();
			if (action === "retry-contests") {
				this.contests = null;
				this.show_contest_list();
			}
			if (action === "filter") {
				this.contest_filter = el.data("filter");
				this.render_contest_list();
			}
			if (action === "open-contest") this.open_contest(el.data("contest"));
			if (action === "back-contests") this.back_to_contests();
			if (action === "retry-detail" && this.selected_contest) {
				this.load_leaderboard(this.selected_contest.name);
			}
		});
	}

	show_tab(tab) {
		this.tab = tab;
		this.selected_contest = null;

		$(this.wrapper)
			.find(".lb-tab")
			.each((_, el) => {
				const active = $(el).data("tab") === tab;
				$(el).attr("aria-selected", active ? "true" : "false");
				$(el).attr("tabindex", active ? "0" : "-1");
			});

		if (tab === "xp") {
			this.load_xp();
		} else {
			this.show_contest_list();
		}
	}

	set_content(html) {
		$(this.wrapper).find(".leaderboard-content").html(html);
	}

	loading_html(text) {
		return `
			<div class="leaderboard-loading">
				<div class="loading-spinner"></div>
				<span>${text}</span>
			</div>
		`;
	}

	message_html(icon, title, text, retry_action) {
		return `
			<div class="leaderboard-placeholder">
				<div class="placeholder-icon">${icon}</div>
				<h3>${title}</h3>
				<p>${text}</p>
				${
					retry_action
						? `<button class="lb-btn" data-action="${retry_action}">Try again</button>`
						: ""
				}
			</div>
		`;
	}

	/* =========================================================
	XP LEADERBOARD
	========================================================= */

	async load_xp() {
		const token = ++this.view_token;
		this.set_content(this.loading_html("Loading XP rankings..."));

		try {
			const res = await frappe.call({
				method: "dsa.api.get_xp_leaderboard",
				args: { limit: 100 },
			});

			if (token !== this.view_token) return;

			this.render_xp(res.message || {});
		} catch (error) {
			if (token !== this.view_token) return;

			console.error("Failed to load XP leaderboard:", error);

			this.set_content(
				this.message_html(
					"⚠️",
					"Unable to load XP rankings",
					"Something went wrong while loading the leaderboard.",
					"retry-xp"
				)
			);
		}
	}

	render_xp(data) {
		const rows = (data.leaderboard || []).map((row) => ({
			id: row.user,
			name: row.full_name || row.user,
			image: row.user_image,
			rank: row.rank,
			xp: row.xp,
		}));

		if (!rows.length) {
			this.set_content(
				this.message_html(
					"🏆",
					"No XP earned yet",
					"Solve problems to earn XP and appear on the leaderboard."
				)
			);
			return;
		}

		const me = data.me
			? {
					id: data.me.user,
					name: data.me.full_name || data.me.user,
					image: data.me.user_image,
					rank: data.me.rank,
					xp: data.me.xp,
			  }
			: null;

		const rest = rows.slice(3);

		const list = rest.length
			? `
				<div class="lb-list lb-list--xp" role="table" aria-label="XP rankings">
					<div class="lb-row lb-row--head" role="row">
						<div role="columnheader">Rank</div>
						<div role="columnheader">User</div>
						<div class="lb-num" role="columnheader">XP</div>
					</div>
					${rest
						.map(
							(row) => `
								<div class="lb-row ${this.is_me(row.id) ? "is-me" : ""}" role="row">
									<div role="cell"><span class="lb-rank">#${row.rank}</span></div>
									<div role="cell">${this.user_cell(row)}</div>
									<div class="lb-num" role="cell">
										<strong class="lb-score">${this.fmt_num(row.xp)}</strong>
										<span class="lb-muted"> XP</span>
									</div>
								</div>
							`
						)
						.join("")}
				</div>
			`
			: "";

		const me_bar = me
			? `
				<div class="lb-me-bar" role="status">
					<span class="lb-rank">#${me.rank}</span>
					<div class="lb-user">
						${this.avatar(me)}
						<div>
							<div class="lb-me-bar-label">Your ranking</div>
							<div class="lb-user-name">${this.escape_html(me.name)}</div>
						</div>
					</div>
					<div class="lb-num">
						<strong class="lb-score">${this.fmt_num(me.xp)}</strong>
						<span class="lb-muted"> XP</span>
					</div>
				</div>
			`
			: "";

		this.set_content(`
			<div class="lb-fade">
				<div class="lb-section-head">
					<div>
						<h2>XP Rankings</h2>
						<p>Overall progress across every problem you solve.</p>
					</div>
					<div class="lb-chips">
						<span class="lb-chip lb-chip--active">All Time</span>
						<span class="lb-chip">${this.fmt_num(data.total || rows.length)} learners</span>
					</div>
				</div>

				${this.podium_html(rows, (row) => ({
					value: this.fmt_num(row.xp),
					unit: "XP",
					sub: "",
				}))}

				${list}
				${me_bar}
			</div>
		`);
	}

	/* =========================================================
	CONTEST LIST
	========================================================= */

	async show_contest_list() {
		const token = ++this.view_token;
		this.selected_contest = null;

		if (!this.contests) {
			this.set_content(this.loading_html("Loading contests..."));

			try {
				await this.ensure_contests();
			} catch (error) {
				if (token !== this.view_token) return;

				console.error("Failed to load contests:", error);

				this.set_content(
					this.message_html(
						"⚠️",
						"Unable to load contests",
						"Something went wrong while loading contests.",
						"retry-contests"
					)
				);
				return;
			}
		}

		if (token !== this.view_token) return;

		this.render_contest_list();
	}

	async ensure_contests() {
		if (this.contests) return;

		const [contests, counts] = await Promise.all([
			this.fetch_all_contests(),
			this.fetch_participant_counts(),
		]);

		this.counts = counts;
		this.contests = contests.map((contest) => ({
			...contest,
			phase: this.contest_phase(contest),
		}));
	}

	// Existing endpoint, paged so contests beyond the first 100 aren't dropped.
	async fetch_all_contests() {
		const page_size = 100;
		let start = 0;
		let all = [];

		while (true) {
			const res = await frappe.call({
				method: "dsa.api.get_contests",
				args: {
					limit_start: start,
					limit_page_length: page_size,
				},
			});

			const batch = res.message || [];
			all = all.concat(batch);

			if (batch.length < page_size) break;
			start += page_size;
		}

		return all;
	}

	// Optional: if the endpoint isn't available, cards just hide the count.
	async fetch_participant_counts() {
		try {
			const res = await frappe.call({
				method: "dsa.api.get_contest_participant_counts",
				silent: true,
			});

			return res.message || {};
		} catch (error) {
			return null;
		}
	}

	contest_phase(contest) {
		const status = String(contest.status || "").toLowerCase();

		if (["active", "live", "ongoing", "running", "in progress"].includes(status)) return "live";
		if (["upcoming", "scheduled", "not started", "starting soon"].includes(status)) return "upcoming";
		if (["ended", "completed", "past", "finished", "closed"].includes(status)) return "past";

		// Unknown status text: fall back to the contest dates.
		const now = new Date();
		const start = this.to_date(contest.start_date);
		const end = this.to_date(contest.end_date);

		if (start && now < start) return "upcoming";
		if (end && now > end) return "past";
		return "live";
	}

	render_contest_list() {
		const contests = this.contests || [];

		const time = (value) => {
			const date = this.to_date(value);
			return date ? date.getTime() : 0;
		};

		const active = contests
			.filter((c) => c.phase !== "past")
			.sort((a, b) => {
				if (a.phase !== b.phase) return a.phase === "live" ? -1 : 1;
				return time(a.start_date) - time(b.start_date);
			});

		const past = contests
			.filter((c) => c.phase === "past")
			.sort((a, b) => time(b.end_date) - time(a.end_date));

		if (!this.contest_filter) {
			this.contest_filter = active.length || !past.length ? "active" : "past";
		}

		const shown = this.contest_filter === "active" ? active : past;

		const cards = shown.length
			? `<div class="lb-grid">${shown.map((c) => this.contest_card_html(c)).join("")}</div>`
			: this.message_html(
					this.contest_filter === "active" ? "⚔" : "📁",
					this.contest_filter === "active" ? "No active contests" : "No past contests",
					this.contest_filter === "active"
						? "There are no live or upcoming contests right now."
						: "Finished contests will appear here."
			  );

		this.set_content(`
			<div class="lb-fade">
				<div class="lb-section-head">
					<div>
						<h2>Contest Leaderboards</h2>
						<p>Pick a contest to see how everyone placed.</p>
					</div>

					<div class="lb-segment" role="group" aria-label="Contest filter">
						<button class="lb-seg-btn" data-action="filter" data-filter="active"
							aria-pressed="${this.contest_filter === "active"}">
							Active <span class="lb-seg-count">${active.length}</span>
						</button>
						<button class="lb-seg-btn" data-action="filter" data-filter="past"
							aria-pressed="${this.contest_filter === "past"}">
							Past <span class="lb-seg-count">${past.length}</span>
						</button>
					</div>
				</div>

				${cards}
			</div>
		`);
	}

	contest_card_html(contest) {
		const count = this.participant_count(contest.name);
		const range = this.format_range(contest.start_date, contest.end_date);

		return `
			<button class="lb-contest-card phase-${contest.phase}"
				data-action="open-contest" data-contest="${this.escape_html(contest.name)}">
				<div class="lb-contest-top">
					${this.badge_html(contest.phase)}
				</div>

				<h3 class="lb-contest-title">${this.escape_html(contest.title || contest.name)}</h3>

				<div class="lb-meta">
					${
						count !== null
							? `<div class="lb-meta-line">${this.icon("users")}<span>${this.fmt_num(count)} participant${count === 1 ? "" : "s"}</span></div>`
							: ""
					}
					${
						range
							? `<div class="lb-meta-line">${this.icon("calendar")}<span>${this.escape_html(range)}</span></div>`
							: ""
					}
				</div>

				<span class="lb-view">View ${this.icon("arrow")}</span>
			</button>
		`;
	}

	badge_html(phase) {
		const labels = { live: "Live", upcoming: "Upcoming", past: "Ended" };
		return `<span class="lb-badge lb-badge--${phase}">${labels[phase] || ""}</span>`;
	}

	participant_count(name) {
		if (!this.counts) return null;
		return Number(this.counts[name] || 0);
	}

	/* =========================================================
	CONTEST DETAIL
	========================================================= */

	open_contest(name) {
		const contest = (this.contests || []).find((c) => c.name === name);
		if (!contest) return;

		this.selected_contest = contest;
		this.load_leaderboard(name);
	}

	back_to_contests() {
		this.selected_contest = null;
		this.show_contest_list();
	}

	async load_leaderboard(contest) {
		const token = ++this.view_token;

		this.set_content(this.loading_html("Loading leaderboard..."));

		try {
			const res = await frappe.call({
				method: "dsa.api.get_contest_leaderboard",
				args: {
					contest: contest,
				},
			});

			if (token !== this.view_token) return;

			const leaderboard = res.message?.leaderboard || [];

			this.render_leaderboard(leaderboard);
		} catch (error) {
			if (token !== this.view_token) return;

			console.error("Failed to load leaderboard:", error);

			this.set_content(`
				<button class="lb-back" data-action="back-contests">
					${this.icon("back")} Contest Leaderboards
				</button>
				${this.message_html(
					"⚠️",
					"Unable to load leaderboard",
					"Something went wrong while loading the leaderboard.",
					"retry-detail"
				)}
			`);
		}
	}

	render_leaderboard(leaderboard) {
		const contest = this.selected_contest || {};
		const range = this.format_range(contest.start_date, contest.end_date);

		const head = `
			<button class="lb-back" data-action="back-contests">
				${this.icon("back")} Contest Leaderboards
			</button>

			<div class="lb-detail-head">
				<h2>${this.escape_html(contest.title || contest.name || "Contest")}</h2>
				<div class="lb-chips">
					${contest.phase ? this.badge_html(contest.phase) : ""}
					<span class="lb-chip">${this.fmt_num(leaderboard.length)} participant${leaderboard.length === 1 ? "" : "s"}</span>
					${range ? `<span class="lb-chip">${this.escape_html(range)}</span>` : ""}
				</div>
			</div>
		`;

		if (!leaderboard.length) {
			this.set_content(`
				<div class="lb-fade">
					${head}
					${this.message_html(
						"🏆",
						"No participants yet",
						"The leaderboard will appear once participants join the contest."
					)}
				</div>
			`);
			return;
		}

		const rows = leaderboard.map((row) => ({
			id: row.member,
			name: row.full_name || row.member,
			rank: row.rank,
			score: row.total_score,
			solved: row.solved_count,
			submissions: row.submission_count,
			time: row.total_solving_time,
		}));

		const rest = rows.slice(3);

		const list = rest.length
			? `
				<div class="lb-list lb-list--contest" role="table" aria-label="Contest rankings">
					<div class="lb-row lb-row--head" role="row">
						<div role="columnheader">Rank</div>
						<div role="columnheader">Participant</div>
						<div class="lb-num" role="columnheader">Score</div>
						<div class="lb-num lb-extra" role="columnheader">Solved</div>
						<div class="lb-num lb-extra" role="columnheader">Submissions</div>
						<div class="lb-num lb-extra" role="columnheader">Time</div>
					</div>
					${rest
						.map(
							(row) => `
								<div class="lb-row ${this.is_me(row.id) ? "is-me" : ""}" role="row">
									<div role="cell"><span class="lb-rank">#${row.rank}</span></div>
									<div role="cell">${this.user_cell(row)}</div>
									<div class="lb-num" role="cell">
										<strong class="lb-score">${this.fmt_num(row.score)}</strong>
										<span class="lb-muted"> pts</span>
									</div>
									<div class="lb-num lb-extra" role="cell">${this.fmt_num(row.solved)}</div>
									<div class="lb-num lb-extra" role="cell">${this.fmt_num(row.submissions)}</div>
									<div class="lb-num lb-extra lb-muted" role="cell">${this.format_duration(row.time)}</div>
								</div>
							`
						)
						.join("")}
				</div>
			`
			: "";

		this.set_content(`
			<div class="lb-fade">
				${head}

				${this.podium_html(rows, (row) => ({
					value: this.fmt_num(row.score),
					unit: "pts",
					sub: `${this.fmt_num(row.solved)} solved`,
				}))}

				${list}
			</div>
		`);
	}

	/* =========================================================
	SHARED PIECES
	========================================================= */

	podium_html(rows, describe) {
		const top = rows.slice(0, 3);

		// Visual order: 2nd, 1st, 3rd (only those that exist).
		const order = [1, 0, 2].filter((index) => top[index]);

		return `
			<div class="lb-podium" role="list" aria-label="Top ${top.length}">
				${order
					.map((index) => {
						const row = top[index];
						const info = describe(row);

						return `
							<div class="lb-podium-card place-${index + 1} ${this.is_me(row.id) ? "is-me" : ""}" role="listitem">
								<span class="lb-medal" aria-label="Rank ${row.rank}">${row.rank}</span>
								${this.avatar(row, true)}
								<div class="lb-podium-name" title="${this.escape_html(row.name)}">
									${this.escape_html(row.name)}${this.is_me(row.id) ? ` <span class="lb-you">You</span>` : ""}
								</div>
								<div class="lb-podium-value">${info.value}<small>${info.unit}</small></div>
								${info.sub ? `<div class="lb-podium-sub">${info.sub}</div>` : ""}
							</div>
						`;
					})
					.join("")}
			</div>
		`;
	}

	user_cell(row) {
		return `
			<div class="lb-user">
				${this.avatar(row)}
				<span class="lb-user-name">${this.escape_html(row.name)}</span>
				${this.is_me(row.id) ? `<span class="lb-you">You</span>` : ""}
			</div>
		`;
	}

	avatar(row, large = false) {
		const cls = `lb-avatar ${large ? "lb-avatar--lg" : ""}`;
		const image = row.image && /^(\/|https?:)/.test(row.image) ? row.image : null;

		if (image) {
			return `<span class="${cls}"><img src="${this.escape_html(image)}" alt="" loading="lazy"></span>`;
		}

		return `<span class="${cls}" aria-hidden="true">${this.escape_html(this.initials(row.name))}</span>`;
	}

	initials(name) {
		const parts = String(name || "?")
			.replace(/@.*$/, "")
			.split(/[\s._-]+/)
			.filter(Boolean);

		if (!parts.length) return "?";
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

		return (parts[0][0] + parts[1][0]).toUpperCase();
	}

	is_me(id) {
		return !!id && id === frappe.session.user;
	}

	fmt_num(value) {
		return Number(value || 0).toLocaleString();
	}

	to_date(value) {
		if (!value) return null;

		try {
			const date = frappe.datetime.str_to_obj(value);
			return isNaN(date) ? null : date;
		} catch (error) {
			return null;
		}
	}

	format_range(start, end) {
		const a = this.to_date(start);
		const b = this.to_date(end);

		if (!a || !b) return "";

		const this_year = new Date().getFullYear();

		const fmt = (date) =>
			date.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				...(date.getFullYear() !== this_year ? { year: "numeric" } : {}),
			});

		return `${fmt(a)} – ${fmt(b)}`;
	}

	format_duration(seconds) {
		const total = Math.round(Number(seconds) || 0);

		if (total <= 0) return "—";

		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;

		if (h) return `${h}h ${m}m`;
		if (m) return `${m}m ${s}s`;
		return `${s}s`;
	}

	format_date(value) {
		return frappe.datetime.str_to_user(value);
	}

	escape_html(value) {
		return String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		}[char]));
	}

	icon(name) {
		const attrs = `viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

		const icons = {
			home: `<svg ${attrs}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>`,
			users: `<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			calendar: `<svg ${attrs}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
			arrow: `<svg ${attrs}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
			back: `<svg ${attrs}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
		};

		return `<span class="inline-icon inline-icon-${name}">${
			icons[name] || ""
		}</span>`;
	}
}

window.LeaderboardPage = LeaderboardPage;