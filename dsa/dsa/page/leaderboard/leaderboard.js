frappe.pages["leaderboard"].on_page_load = function (wrapper) {
	new LeaderboardPage(wrapper);
};

class LeaderboardPage {
	constructor(wrapper) {
		this.wrapper = wrapper;

		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Leaderboard",
			single_column: true,
		});

		this.add_styles();
		this.render();
		this.load_contests();
	}

	add_styles() {
		if ($("#dsa-leaderboard-styles").length) {
			return;
		}

		$("head").append(`
			<style id="dsa-leaderboard-styles">

			/* Theme-aware colors: reads Frappe's theme variables so the
			   page follows whatever light/dark mode is currently active. */

			.leaderboard-page {
				--accent: #f5a800;
				--accent-2: #ffcd39;
				--accent-ink: #1a1400;
				--accent-soft: rgba(245, 168, 0, 0.13);
				--accent-soft-strong: rgba(245, 168, 0, 0.22);
				--green: var(--text-on-green, #1f9d5c);
				--green-2: #34d180;
				--green-soft: rgba(31, 157, 92, 0.13);
				--red: var(--text-on-red, #e6484a);
				--silver: #9aa3ad;
				--bronze: #c97b3d;
				--card-shadow: 0 1px 2px rgba(15, 15, 15, 0.04), 0 8px 24px rgba(15, 15, 15, 0.05);
				--card-shadow-hover: 0 2px 4px rgba(15, 15, 15, 0.06), 0 16px 36px rgba(15, 15, 15, 0.09);

				min-height: 100vh;
				padding: 30px;
				max-width: 1200px;
				margin: 0 auto;
				color: var(--text-color);
				font-family: var(--font-stack, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
				background:
					radial-gradient(720px 320px at 12% -8%, var(--accent-soft), transparent 60%),
					radial-gradient(600px 280px at 100% 0%, var(--green-soft), transparent 55%),
					var(--bg-color);
			}

			.layout-main-section {
				background: var(--bg-color) !important;
				border: none !important;
			}

			.layout-main-section-wrapper {
				background: var(--bg-color) !important;
			}

			.page-container {
				background: var(--bg-color) !important;
			}

			.leaderboard-header {
				position: relative;
				display: flex;
				align-items: center;
				gap: 20px;
				padding: 36px 40px;
				margin-bottom: 28px;
				border-radius: 18px;
				background: linear-gradient(155deg, var(--card-bg) 0%, var(--card-bg) 60%, var(--accent-soft) 170%);
				border: 1px solid var(--border-color);
				box-shadow: var(--card-shadow);
				overflow: hidden;
			}

			.leaderboard-header::before {
				content: "";
				position: absolute;
				inset: 0;
				background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
				background-size: 22px 22px;
				-webkit-mask-image: linear-gradient(155deg, rgba(0,0,0,0.5), transparent 65%);
				mask-image: linear-gradient(155deg, rgba(0,0,0,0.5), transparent 65%);
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
				background: linear-gradient(155deg, var(--accent-2), var(--accent));
				box-shadow: 0 8px 20px var(--accent-soft-strong);
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
				color: var(--text-color);
			}

			.leaderboard-header p {
				margin: 0;
				color: var(--text-muted);
				font-size: 14px;
			}

			.leaderboard-controls {
				max-width: 420px;
				margin-bottom: 26px;
				padding: 18px 20px;
				border-radius: 14px;
				background: var(--card-bg);
				border: 1px solid var(--border-color);
				box-shadow: var(--card-shadow);
			}

			.leaderboard-controls label {
				display: block;
				margin-bottom: 8px;
				font-weight: 600;
				font-size: 12px;
				letter-spacing: 0.3px;
				text-transform: uppercase;
				color: var(--text-muted);
			}

			.leaderboard-controls select.form-control {
				width: 100%;
				height: 40px;
				padding: 0 14px;
				border-radius: 9px;
				border: 1px solid var(--border-color);
				background: var(--control-bg);
				color: var(--text-color);
				font-size: 14px;
				font-weight: 500;
				appearance: none;
				background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
					linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
				background-position: calc(100% - 20px) center, calc(100% - 15px) center;
				background-size: 5px 5px, 5px 5px;
				background-repeat: no-repeat;
				cursor: pointer;
				transition: border-color 0.15s ease, box-shadow 0.15s ease;
			}

			.leaderboard-controls select.form-control:focus {
				outline: none;
				border-color: var(--accent);
				box-shadow: 0 0 0 3px var(--accent-soft);
			}

			.leaderboard-content {
				margin-top: 20px;
			}

			.leaderboard-table-wrapper {
				overflow-x: auto;
				border: 1px solid var(--border-color);
				border-radius: 14px;
				background: var(--card-bg);
				box-shadow: var(--card-shadow);
			}

			.leaderboard-table {
				width: 100%;
				min-width: 640px;
				border-collapse: collapse;
			}

			.leaderboard-table th,
			.leaderboard-table td {
				padding: 15px 18px;
				border-bottom: 1px solid var(--border-color);
				text-align: left;
			}

			.leaderboard-table th {
				font-weight: 600;
				font-size: 11px;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				color: var(--text-muted);
				background: var(--control-bg);
			}

			.leaderboard-table td {
				font-size: 14px;
				color: var(--text-color);
			}

			.leaderboard-table tbody tr:last-child td {
				border-bottom: none;
			}

			.leaderboard-table tbody tr {
				transition: background 0.15s ease;
			}

			.leaderboard-table tbody tr:hover {
				background: var(--accent-soft);
			}

			.leaderboard-rank {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				min-width: 36px;
				height: 30px;
				padding: 0 8px;
				border-radius: 8px;
				background: var(--accent-soft);
				color: var(--accent);
				font-weight: 700;
			}

			.leaderboard-table tbody tr:nth-child(1) .leaderboard-rank {
				background: linear-gradient(135deg, var(--accent-2), var(--accent));
				color: var(--accent-ink);
				box-shadow: 0 4px 10px var(--accent-soft-strong);
			}

			.leaderboard-table tbody tr:nth-child(2) .leaderboard-rank {
				background: linear-gradient(135deg, #c7ced6, var(--silver));
				color: #23282e;
			}

			.leaderboard-table tbody tr:nth-child(3) .leaderboard-rank {
				background: linear-gradient(135deg, #dc9b64, var(--bronze));
				color: #2b1a0c;
			}

			.leaderboard-user {
				font-weight: 600;
				color: var(--text-color);
			}

			.leaderboard-score {
				font-size: 16px;
				color: var(--accent);
			}

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
				border: 1px dashed var(--border-color);
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
				color: var(--text-color);
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
				border: 3px solid var(--border-color);
				border-top-color: var(--accent);
				border-radius: 50%;
				animation: leaderboard-spin 0.8s linear infinite;
				margin-bottom: 4px;
			}

			@keyframes leaderboard-spin {
				to {
					transform: rotate(360deg);
				}
			}

			@media (max-width: 600px) {
				.leaderboard-header {
					flex-direction: column;
					align-items: flex-start;
					padding: 28px 24px;
				}
			}

			</style>
		`);
	}

	render() {
		$(this.wrapper).find(".layout-main-section").html(`
			<div class="leaderboard-page">
				<div class="leaderboard-header">
					<div class="leaderboard-header-icon">🏆</div>
					<div class="leaderboard-header-text">
						<h1>Leaderboard</h1>
						<p>See how participants are performing in each contest.</p>
					</div>
				</div>

				<div class="leaderboard-controls">
					<label for="leaderboard-contest">Contest</label>
					<select id="leaderboard-contest" class="form-control">
						<option value="">Select a contest</option>
					</select>
				</div>

				<div class="leaderboard-content">
					<div class="leaderboard-placeholder">
						<div class="placeholder-icon">📊</div>
						<h3>Select a contest</h3>
						<p>Choose a contest to view its leaderboard.</p>
					</div>
				</div>
			</div>
		`);

		$("#leaderboard-contest").on("change", (event) => {
			const contest = $(event.currentTarget).val();

			if (contest) {
				this.load_leaderboard(contest);
			} else {
				this.render_placeholder();
			}
		});
	}

	async load_contests() {
		try {
			const res = await frappe.call({
				method: "dsa.api.get_contests",
				args: {
					limit_start: 0,
					limit_page_length: 100,
				},
			});

			const contests = res.message || [];
			const select = $("#leaderboard-contest");

			contests.forEach((contest) => {
				select.append(`
					<option value="${this.escape_html(contest.name)}">
						${this.escape_html(contest.title || contest.name)}
					</option>
				`);
			});
		} catch (error) {
			console.error("Failed to load contests:", error);

			$(".leaderboard-content").html(`
				<div class="leaderboard-placeholder">
					<div class="placeholder-icon">⚠️</div>
					<h3>Unable to load contests</h3>
					<p>Something went wrong while loading contests.</p>
				</div>
			`);
		}
	}

	async load_leaderboard(contest) {
		$(".leaderboard-content").html(`
			<div class="leaderboard-loading">
				<div class="loading-spinner"></div>
				<span>Loading leaderboard...</span>
			</div>
		`);

		try {
			const res = await frappe.call({
				method: "dsa.api.get_contest_leaderboard",
				args: {
					contest: contest,
				},
			});

			const leaderboard = res.message?.leaderboard || [];

			this.render_leaderboard(leaderboard);
		} catch (error) {
			console.error("Failed to load leaderboard:", error);

			$(".leaderboard-content").html(`
				<div class="leaderboard-placeholder">
					<div class="placeholder-icon">⚠️</div>
					<h3>Unable to load leaderboard</h3>
					<p>Something went wrong while loading the leaderboard.</p>
				</div>
			`);
		}
	}

	render_placeholder() {
		$(".leaderboard-content").html(`
			<div class="leaderboard-placeholder">
				<div class="placeholder-icon">📊</div>
				<h3>Select a contest</h3>
				<p>Choose a contest to view its leaderboard.</p>
			</div>
		`);
	}

	render_leaderboard(leaderboard) {
		if (!leaderboard.length) {
			$(".leaderboard-content").html(`
				<div class="leaderboard-placeholder">
					<div class="placeholder-icon">🏆</div>
					<h3>No participants yet</h3>
					<p>The leaderboard will appear once participants join the contest.</p>
				</div>
			`);
			return;
		}

		$(".leaderboard-content").html(`
			<div class="leaderboard-table-wrapper">
				<table class="leaderboard-table">
					<thead>
						<tr>
							<th>Rank</th>
							<th>Participant</th>
							<th>Score</th>
							<th>Solved</th>
							<th>Submissions</th>
							<th>Time</th>
						</tr>
					</thead>

					<tbody>
						${leaderboard
							.map(
								(row) => `
									<tr>
										<td>
											<span class="leaderboard-rank">
												#${row.rank}
											</span>
										</td>

										<td>
											<div class="leaderboard-user">
												${this.escape_html(row.full_name || row.member)}
											</div>
										</td>

										<td>
											<strong class="leaderboard-score">
												${row.total_score}
											</strong>
										</td>

										<td>${row.solved_count}</td>

										<td>${row.submission_count}</td>

										<td>
											${row.time ? this.format_date(row.time) : "—"}
										</td>
									</tr>
								`
							)
							.join("")}
					</tbody>
				</table>
			</div>
		`);
	}

	format_date(value) {
		return frappe.datetime.str_to_user(value);
	}

	escape_html(value) {
		return $("<div>").text(value || "").html();
	}
}