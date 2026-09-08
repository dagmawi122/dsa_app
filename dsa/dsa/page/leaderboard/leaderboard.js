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
				.leaderboard-page {
					padding: 30px;
				}

				.leaderboard-header {
					margin-bottom: 30px;
				}

				.leaderboard-header h1 {
					margin-bottom: 8px;
				}

				.leaderboard-header p {
					color: var(--text-muted);
				}

				.leaderboard-controls {
					max-width: 500px;
					margin-bottom: 30px;
				}

				.leaderboard-controls label {
					display: block;
					margin-bottom: 8px;
					font-weight: 600;
				}

				.leaderboard-content {
					margin-top: 20px;
				}

				.leaderboard-table-wrapper {
					overflow-x: auto;
				}

				.leaderboard-table {
					width: 100%;
					border-collapse: collapse;
				}

				.leaderboard-table th,
				.leaderboard-table td {
					padding: 14px 16px;
					border-bottom: 1px solid var(--border-color);
					text-align: left;
				}

				.leaderboard-table th {
					font-weight: 600;
				}

				.leaderboard-rank {
					font-weight: 600;
				}

				.leaderboard-score {
					font-size: 16px;
				}

				.leaderboard-placeholder,
				.leaderboard-loading {
					padding: 50px;
					text-align: center;
					color: var(--text-muted);
				}
			</style>
		`);
	}

	render() {
		$(this.wrapper).find(".layout-main-section").html(`
			<div class="leaderboard-page">
				<div class="leaderboard-header">
					<h1>Leaderboard</h1>
					<p>See how participants are performing in each contest.</p>
				</div>

				<div class="leaderboard-controls">
					<label for="leaderboard-contest">Contest</label>
					<select id="leaderboard-contest" class="form-control">
						<option value="">Select a contest</option>
					</select>
				</div>

				<div class="leaderboard-content">
					<div class="leaderboard-placeholder">
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
					<h3>Unable to load leaderboard</h3>
					<p>Something went wrong while loading the leaderboard.</p>
				</div>
			`);
		}
	}

	render_placeholder() {
		$(".leaderboard-content").html(`
			<div class="leaderboard-placeholder">
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
