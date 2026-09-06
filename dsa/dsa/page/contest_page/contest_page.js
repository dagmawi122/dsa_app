frappe.pages["contest-page"].on_page_load = function (wrapper) {
	new ContestPage(wrapper);
};

frappe.pages["contest-page"].on_page_show = function (wrapper) {
	const route = frappe.get_route();
	const contest_name = route[1];

	if (wrapper.contest_page_instance) {
		wrapper.contest_page_instance.handle_route_change(contest_name);
	}
};

class ContestPage {
	constructor(wrapper) {
		this.wrapper = wrapper;
		wrapper.contest_page_instance = this;

		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Contests",
			single_column: true,
		});

		this.contest_name = frappe.get_route()[1];
		this.add_styles();

		if (this.contest_name) {
			this.render_details();
			this.load_contest();
		} else {
			this.render_listing();
			this.load_contests();
		}
	}

	handle_route_change(contest_name) {
		this.contest_name = contest_name;

		if (contest_name) {
			this.render_details();
			this.load_contest();
		} else {
			this.render_listing();
			this.load_contests();
		}
	}

	/* =========================================================
       LISTING
       ========================================================= */

	render_listing() {
		$(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-page">
                <div class="contest-hero">
                    <div class="hero-content">
                        <div class="hero-badge">
                            <span class="hero-badge-dot"></span>
                            COMPETITIVE PROGRAMMING
                        </div>
                        <h1>Contests</h1>
                        <p>
                            Challenge yourself, solve problems, and compete
                            with other developers.
                        </p>
                    </div>

                    <div class="hero-decoration">
                        <div class="code-symbol">
                            &lt;/&gt;
                        </div>
                    </div>
                </div>

                <div class="contest-content">
                    <div class="contest-loading">
                        <div class="loading-spinner"></div>
                        <span>Loading contests...</span>
                    </div>
                </div>
            </div>
        `);
	}

	async load_contests() {
		try {
			const [contestsRes, myContestsRes] = await Promise.all([
				frappe.call({
					method: "dsa.api.get_contests",
					args: { limit_start: 0, limit_page_length: 100 },
				}),
				frappe.session.user !== "Guest"
					? frappe
							.call({
								method: "dsa.dsa.doctype.contest_registration.contest_registration.get_my_contests",
							})
							.catch(() => ({ message: [] }))
					: Promise.resolve({ message: [] }),
			]);

			const contests = contestsRes.message || [];
			const myContests = myContestsRes.message || [];

			this.render_contests(contests, myContests);
		} catch (error) {
			console.error("Failed to load contests:", error);
			$(".contest-content").html(`
                <div class="contest-state">
                    <div class="state-icon error">!</div>
                    <h3>Unable to load contests</h3>
                    <p>Something went wrong while loading contests.</p>
                    <button class="contest-retry">Try Again</button>
                </div>
            `);
			$(".contest-retry").on("click", () => this.load_contests());
		}
	}

	render_contests(contests, myContests = []) {
		if (!contests.length && !myContests.length) {
			$(".contest-content").html(`
                <div class="contest-state">
                    <div class="state-icon">☰</div>
                    <h3>No contests available</h3>
                    <p>Check back later for upcoming competitions.</p>
                </div>
            `);
			return;
		}

		const registeredNames = new Set(myContests.map((c) => c.contest || c.name));

		const upcoming = contests.filter((c) => c.status === "Upcoming");
		const running = contests.filter((c) => c.status === "Active");
		const ended = contests.filter((c) => c.status === "Completed");

		$(".contest-content").html(`
            ${
				myContests.length
					? this.render_section(
							"My Registered Contests",
							"Contests you have enrolled in",
							myContests,
							"registered",
							true
					  )
					: ""
			}
            ${this.render_section(
				"Running",
				"Contests happening right now",
				running,
				"running",
				false,
				registeredNames
			)}
            ${this.render_section(
				"Upcoming",
				"Get ready for the next challenge",
				upcoming,
				"upcoming",
				false,
				registeredNames
			)}
            ${this.render_section(
				"Ended",
				"Previous competitions",
				ended,
				"ended",
				false,
				registeredNames
			)}
        `);

		this.bind_listing_events();
	}

	render_section(
		title,
		subtitle,
		contests,
		type,
		isMySection = false,
		registeredNames = new Set()
	) {
		if (!contests.length) return "";

		return `
            <section class="contest-section ${type}-section">
                <div class="section-heading">
                    <div class="section-title-wrapper">
                        <div class="section-icon ${type}">
                            ${this.get_section_icon(type)}
                        </div>
                        <div>
                            <h2>${title}</h2>
                            <p>${subtitle}</p>
                        </div>
                    </div>
                    <span class="section-count">${contests.length}</span>
                </div>

                <div class="contest-grid">
                    ${contests
						.map((contest) =>
							this.render_card(
								contest,
								type,
								registeredNames.has(contest.name || contest.contest)
							)
						)
						.join("")}
                </div>
            </section>
        `;
	}

	render_card(contest, type, isRegistered = false) {
		const contestName = contest.contest || contest.name;
		const start = this.format_date(contest.start_date);
		const duration = this.calculate_duration(contest.start_date, contest.end_date);
		const problemCount =
			contest.problem_count !== undefined
				? contest.problem_count
				: contest.problems
				? contest.problems.length
				: "—";
		const description =
			this.strip_html(contest.description) || "Put your problem-solving skills to the test.";

		const cardType = contest.status ? this.get_status_type(contest.status) : type;

		return `
            <article class="contest-card ${cardType}" data-contest="${this.escape_html(
			contestName
		)}">
                <div class="card-top">
                    <div class="card-badges">
                        <span class="contest-status ${cardType}">
                            <span class="status-dot"></span>
                            ${this.get_status_label(cardType)}
                        </span>
                        ${
							isRegistered
								? `<span class="registered-badge"><i class="fa fa-check"></i> Enrolled</span>`
								: ""
						}
                    </div>
                    <span class="contest-code">${this.escape_html(contestName)}</span>
                </div>

                <h3 class="contest-title">${this.escape_html(contest.title || contestName)}</h3>
                <p class="contest-description">${this.escape_html(description)}</p>

                <div class="contest-meta">
                    <div class="meta-item">
                        <div class="meta-icon"><i class="fa fa-calendar"></i></div>
                        <div>
                            <span class="meta-label">STARTS</span>
                            <span class="meta-value">${start}</span>
                        </div>
                    </div>

                    <div class="meta-item">
                        <div class="meta-icon"><i class="fa fa-clock-o"></i></div>
                        <div>
                            <span class="meta-label">DURATION</span>
                            <span class="meta-value">${duration}</span>
                        </div>
                    </div>

                    <div class="meta-item">
                        <div class="meta-icon"><i class="fa fa-code"></i></div>
                        <div>
                            <span class="meta-label">PROBLEMS</span>
                            <span class="meta-value">${problemCount}</span>
                        </div>
                    </div>
                </div>

                <div class="card-divider"></div>

                <div class="card-footer">
                    <span class="contest-end">
                        ${
							cardType === "ended"
								? `Ended ${this.format_date(contest.end_date)}`
								: `Ends ${this.format_date(contest.end_date)}`
						}
                    </span>

                    <button class="view-contest" data-contest="${this.escape_html(contestName)}">
                        View Contest <span class="arrow">→</span>
                    </button>
                </div>
            </article>
        `;
	}

	bind_listing_events() {
		$(".view-contest").on("click", (event) => {
			event.stopPropagation();
			const contest_name = $(event.currentTarget).data("contest");
			this.open_contest(contest_name);
		});

		$(".contest-card").on("click", (event) => {
			if ($(event.target).closest(".view-contest").length) return;
			const contest_name = $(event.currentTarget).data("contest");
			this.open_contest(contest_name);
		});
	}

	open_contest(contest_name) {
		frappe.set_route("contest-page", contest_name);
	}

	/* =========================================================
       DETAILS
       ========================================================= */

	render_details() {
		$(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-page">
                <div class="contest-details-page">
                    <button class="back-to-contests">
                        <span>←</span> Back to Contests
                    </button>

                    <div class="details-loading">
                        <div class="loading-spinner"></div>
                        <span>Loading contest...</span>
                    </div>
                </div>
            </div>
        `);
	}

	async load_contest() {
		try {
			const [contestRes, statusRes] = await Promise.all([
				frappe.call({
					method: "dsa.api.get_contest",
					args: { name: this.contest_name },
				}),
				frappe
					.call({
						method: "dsa.dsa.doctype.contest_registration.contest_registration.get_participant_status",
						args: { contest: this.contest_name },
					})
					.catch(() => ({ message: { registered: false } })),
			]);

			const contest = contestRes.message;
			const participantStatus = statusRes.message || { registered: false };

			if (!contest) {
				this.render_not_found();
				return;
			}

			this.render_contest_details(contest, participantStatus);
		} catch (error) {
			console.error("Failed to load contest:", error);
			this.render_error();
		}
	}

	render_contest_details(contest, participantStatus) {
		const type = this.get_status_type(contest.status);
		const description =
			this.strip_html(contest.description) || "No description available for this contest.";
		const duration = this.calculate_duration(contest.start_date, contest.end_date);
		const problems = contest.problems || [];
		const isRegistered = participantStatus && participantStatus.registered;
		const isEnded = type === "ended";

		let actionButtonsHtml = "";
		if (isRegistered) {
			actionButtonsHtml = `
                <div class="contest-actions-wrapper">
                    <button class="contest-enter-btn" data-contest="${this.escape_html(
						contest.name
					)}">
                        <i class="fa fa-sign-in"></i> Enter Contest
                    </button>
                    ${
						!isEnded
							? `
                    <button class="contest-leave-btn" data-contest="${this.escape_html(
						contest.name
					)}">
                        Leave Contest
                    </button>
                    `
							: ""
					}
                </div>
            `;
		} else if (isEnded) {
			actionButtonsHtml = `
                <button class="contest-join-btn disabled" disabled>
                    Contest Ended
                </button>
            `;
		} else {
			actionButtonsHtml = `
                <button class="contest-join-btn" data-contest="${this.escape_html(contest.name)}">
                    Join Contest
                </button>
            `;
		}

		$(".contest-details-page").html(`
            <!-- BACK -->
            <button class="back-to-contests">
                <span>←</span> Back to Contests
            </button>

            <!-- HERO -->
            <div class="details-hero ${type}">
                <div class="details-hero-content">
                    <div class="details-top-row">
                        <span class="contest-status ${type}">
                            <span class="status-dot"></span>
                            ${this.get_status_label(type)}
                        </span>
                        ${
							isRegistered
								? `<span class="registered-badge"><i class="fa fa-check"></i> Enrolled</span>`
								: ""
						}
                        <span class="details-contest-code">${this.escape_html(contest.name)}</span>
                    </div>

                    <h1>${this.escape_html(contest.title)}</h1>
                    <p>${this.escape_html(description)}</p>

                    ${actionButtonsHtml}
                </div>

                <div class="details-hero-decoration">
                    <span>{ }</span>
                </div>
            </div>

            <!-- INFORMATION -->
            <section class="details-section">
                <div class="details-section-title">
                    <span class="section-line"></span>
                    <div>
                        <h2>Contest Information</h2>
                        <p>Everything you need to know about this contest.</p>
                    </div>
                </div>

                <div class="details-info-grid">
                    <div class="info-card">
                        <div class="info-card-icon"><i class="fa fa-play"></i></div>
                        <div>
                            <span class="info-label">STARTS</span>
                            <strong>${this.format_date(contest.start_date)}</strong>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-icon"><i class="fa fa-stop"></i></div>
                        <div>
                            <span class="info-label">ENDS</span>
                            <strong>${this.format_date(contest.end_date)}</strong>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-icon"><i class="fa fa-clock-o"></i></div>
                        <div>
                            <span class="info-label">DURATION</span>
                            <strong>${duration}</strong>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-icon"><i class="fa fa-code"></i></div>
                        <div>
                            <span class="info-label">PROBLEMS</span>
                            <strong>${problems.length}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ABOUT -->
            <section class="details-section">
                <div class="details-section-title">
                    <span class="section-line"></span>
                    <div>
                        <h2>About This Contest</h2>
                        <p>Overview and rules for participants.</p>
                    </div>
                </div>

                <div class="about-card">
                    <div class="about-icon"><i class="fa fa-info-circle"></i></div>
                    <div class="about-content">
                        <div class="contest-description-full">
                            ${
								contest.description
									? contest.description
									: "<p>No additional instructions provided.</p>"
							}
                        </div>
                    </div>
                </div>
            </section>

            <!-- PROBLEMS -->
            <section class="details-section">
                <div class="details-section-title">
                    <span class="section-line"></span>
                    <div>
                        <h2>Contest Problems</h2>
                        <p>Challenges prepared for this contest.</p>
                    </div>
                </div>

                ${
					problems.length
						? `
                    <div class="contest-problems">
                        ${problems
							.map(
								(p, idx) => `
                            <div class="problem-card" data-problem="${this.escape_html(
								p.problem
							)}">
                                <div class="problem-number">${String(idx + 1).padStart(
									2,
									"0"
								)}</div>
                                <div class="problem-main">
                                    <div class="problem-title">${this.escape_html(p.problem)}</div>
                                    <div class="problem-meta">Order: ${p.order || idx + 1}</div>
                                </div>
                                <div class="problem-points">
                                    <span class="points-label">POINTS</span>
                                    <strong>${p.points || 0}</strong>
                                </div>
                                <div class="problem-arrow">→</div>
                            </div>
                        `
							)
							.join("")}
                    </div>
                `
						: `
                    <div class="problems-placeholder">
                        <div class="placeholder-icon"><i class="fa fa-lock"></i></div>
                        <h3>Problems hidden or not published</h3>
                        <p>Contest problems will appear here once published.</p>
                    </div>
                `
				}
            </section>

            <!-- LEADERBOARD -->
            <section class="details-section">
                <div class="details-section-title">
                    <span class="section-line"></span>
                    <div>
                        <h2>Leaderboard</h2>
                        <p>See how participants are performing in this contest.</p>
                    </div>
                </div>

                <div class="contest-leaderboard">
                    <div class="leaderboard-loading">
                        <div class="loading-spinner"></div>
                        <span>Loading leaderboard...</span>
                    </div>
                </div>
            </section>
        `);

		this.load_leaderboard();
		this.bind_details_events(contest, isRegistered);
	}

	bind_details_events(contest, isRegistered) {
		$(".back-to-contests").on("click", () => {
			frappe.set_route("contest-page");
		});

		$(".contest-enter-btn").on("click", () => {
			frappe.set_route("contest-comp", this.contest_name);
		});

		$(".problem-card").on("click", () => {
			if (isRegistered) {
				frappe.set_route("contest-comp", this.contest_name);
			} else {
				frappe.msgprint({
					title: __("Registration Required"),
					message: __("Please join this contest first to access the challenges."),
					indicator: "orange",
				});
			}
		});

		$(".contest-join-btn:not(.disabled)").on("click", async (event) => {
			const btn = $(event.currentTarget);
			btn.prop("disabled", true).text("Joining...");

			try {
				const res = await frappe.call({
					method: "dsa.dsa.doctype.contest_registration.contest_registration.join_contest",
					args: { contest: this.contest_name },
				});

				frappe.show_alert({
					message: res.message?.message || __("Successfully joined the contest!"),
					indicator: "green",
				});

				frappe.set_route("contest-comp", this.contest_name);
			} catch (err) {
				btn.prop("disabled", false).text("Join Contest");
				const msg = err?.messages
					? err.messages.join(" ")
					: err?.message || __("Could not join contest.");
				frappe.show_alert({ message: msg, indicator: "red" });
			}
		});

		$(".contest-leave-btn").on("click", async () => {
			frappe.confirm(__("Are you sure you want to leave this contest?"), async () => {
				try {
					const res = await frappe.call({
						method: "dsa.dsa.doctype.contest_registration.contest_registration.leave_contest",
						args: { contest: this.contest_name },
					});

					frappe.show_alert({
						message: res.message?.message || __("You have left the contest."),
						indicator: "orange",
					});

					this.load_contest();
				} catch (err) {
					const msg = err?.messages
						? err.messages.join(" ")
						: err?.message || __("Could not leave contest.");
					frappe.show_alert({ message: msg, indicator: "red" });
				}
			});
		});
	}

	async load_leaderboard() {
		try {
			const res = await frappe.call({
				method: "dsa.api.get_contest_leaderboard",
				args: {
					contest: this.contest_name,
				},
			});

			const leaderboard = res.message?.leaderboard || [];

			this.render_leaderboard(leaderboard);
		} catch (error) {
			console.error("Failed to load leaderboard:", error);

			$(".contest-leaderboard").html(`
                <div class="contest-state">
                    <div class="state-icon error">!</div>
                    <h3>Unable to load leaderboard</h3>
                    <p>Something went wrong while loading the leaderboard.</p>
                </div>
            `);
		}
	}

	render_leaderboard(leaderboard) {
		if (!leaderboard.length) {
			$(".contest-leaderboard").html(`
                <div class="problems-placeholder">
                    <div class="placeholder-icon">🏆</div>
                    <h3>No participants yet</h3>
                    <p>The leaderboard will appear once participants join the contest.</p>
                </div>
            `);
			return;
		}

		$(".contest-leaderboard").html(`
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

                                <td>
                                    ${row.solved_count}
                                </td>

                                <td>
                                    ${row.submission_count}
                                </td>

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

	render_not_found() {
		$(".contest-details-page").html(`
            <button class="back-to-contests"><span>←</span> Back to Contests</button>
            <div class="contest-state">
                <div class="state-icon">?</div>
                <h3>Contest not found</h3>
                <p>The requested contest could not be found or has been removed.</p>
            </div>
        `);
		$(".back-to-contests").on("click", () => frappe.set_route("contest-page"));
	}

	render_error() {
		$(".contest-details-page").html(`
            <button class="back-to-contests"><span>←</span> Back to Contests</button>
            <div class="contest-state">
                <div class="state-icon error">!</div>
                <h3>Failed to load contest</h3>
                <p>Could not retrieve contest details.</p>
                <button class="contest-retry">Retry</button>
            </div>
        `);
		$(".back-to-contests").on("click", () => frappe.set_route("contest-page"));
		$(".contest-retry").on("click", () => this.load_contest());
	}

	/* =========================================================
       HELPERS
       ========================================================= */

	get_status_type(status) {
		const s = (status || "").toLowerCase();
		if (s === "active") return "running";
		if (s === "upcoming") return "upcoming";
		return "ended";
	}

	get_status_label(type) {
		if (type === "running") return "Running";
		if (type === "upcoming") return "Upcoming";
		if (type === "registered") return "Enrolled";
		return "Ended";
	}

	get_section_icon(type) {
		if (type === "running") return "▶";
		if (type === "upcoming") return "⏰";
		if (type === "registered") return "★";
		return "✓";
	}

	format_date(dateStr) {
		if (!dateStr) return "—";
		try {
			return frappe.datetime.str_to_user(dateStr);
		} catch {
			return dateStr;
		}
	}

	calculate_duration(startDate, endDate) {
		if (!startDate || !endDate) return "—";
		try {
			const start = new Date(startDate);
			const end = new Date(endDate);
			const diffMs = end - start;
			if (diffMs <= 0) return "—";

			const diffMins = Math.floor(diffMs / (1000 * 60));
			const hours = Math.floor(diffMins / 60);
			const mins = diffMins % 60;
			const days = Math.floor(hours / 24);
			const remHours = hours % 24;

			if (days > 0) return `${days}d ${remHours}h`;
			if (hours > 0) return `${hours}h ${mins}m`;
			return `${mins}m`;
		} catch {
			return "—";
		}
	}

	strip_html(html) {
		if (!html) return "";
		return $("<div>").html(html).text().trim();
	}

	escape_html(str) {
		return frappe.utils.escape_html(str || "");
	}

	add_styles() {
		if ($("#contest-page-styles").length) return;

		$("head").append(`
<style id="contest-page-styles">
.contest-page { padding: 30px; max-width: 1400px; margin: 0 auto; color: #eee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.contest-hero { display: flex; justify-content: space-between; align-items: center; padding: 40px; border-radius: 14px; background: linear-gradient(135deg, #1f1f1f 0%, #151515 100%); border: 1px solid #2e2e2e; margin-bottom: 35px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); }
.hero-badge { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 20px; background: rgba(255, 193, 7, 0.12); color: #ffc107; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 12px; }
.hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #ffc107; animation: pulse-dot 1.8s infinite; }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.contest-hero h1 { font-size: 36px; font-weight: 800; margin: 0 0 10px; color: #fff; }
.contest-hero p { color: #888; font-size: 15px; margin: 0; max-width: 600px; }
.code-symbol { font-size: 40px; color: #333; font-family: monospace; font-weight: 800; border: 2px dashed #2f2f2f; padding: 15px 25px; border-radius: 12px; }
.contest-section { margin-bottom: 40px; }
.section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-title-wrapper { display: flex; align-items: center; gap: 14px; }
.section-icon { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.section-icon.running { background: rgba(40, 199, 111, 0.15); color: #28c76f; }
.section-icon.upcoming { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.section-icon.ended { background: rgba(150, 150, 150, 0.15); color: #888; }
.section-icon.registered { background: rgba(30, 142, 77, 0.2); color: #42b883; }
.section-heading h2 { margin: 0; font-size: 20px; color: #fff; font-weight: 700; }
.section-heading p { margin: 4px 0 0; font-size: 13px; color: #666; }
.section-count { font-size: 14px; color: #888; background: #222; border: 1px solid #333; padding: 3px 10px; border-radius: 12px; }
.contest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
.contest-card { background: #191919; border: 1px solid #282828; border-radius: 12px; padding: 22px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; }
.contest-card:hover { transform: translateY(-3px); border-color: #444; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.card-badges { display: flex; align-items: center; gap: 8px; }
.contest-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.contest-status.running { background: rgba(40, 199, 111, 0.15); color: #28c76f; }
.contest-status.upcoming { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.contest-status.ended { background: rgba(120, 120, 120, 0.15); color: #888; }
.status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.registered-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: rgba(40, 199, 111, 0.2); color: #28c76f; font-size: 10px; font-weight: 700; }
.contest-code { font-family: monospace; font-size: 11px; color: #666; }
.contest-title { font-size: 18px; font-weight: 700; margin: 0 0 10px; color: #fff; }
.contest-description { color: #888; font-size: 13px; line-height: 1.5; margin: 0 0 18px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.contest-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; background: #141414; padding: 10px 12px; border-radius: 8px; border: 1px solid #222; }
.meta-item { display: flex; align-items: center; gap: 8px; }
.meta-icon { color: #666; font-size: 12px; }
.meta-label { display: block; font-size: 9px; color: #555; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
.meta-value { font-size: 11px; color: #ddd; font-weight: 600; }
.card-divider { height: 1px; background: #242424; margin-bottom: 14px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.contest-end { font-size: 11px; color: #666; }
.view-contest { background: transparent; border: 0; color: #ffc107; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; }
.view-contest:hover .arrow { transform: translateX(3px); }
.arrow { transition: transform 0.2s ease; }

/* DETAILS */
.contest-details-page { max-width: 1000px; margin: 0 auto; }
.back-to-contests { background: #222; border: 1px solid #333; color: #bbb; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-bottom: 25px; transition: all 0.2s ease; }
.back-to-contests:hover { background: #2a2a2a; color: #fff; }
.details-hero { padding: 35px; border-radius: 14px; background: #1a1a1a; border: 1px solid #303030; margin-bottom: 30px; display: flex; justify-content: space-between; }
.details-top-row { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.details-contest-code { font-family: monospace; font-size: 12px; color: #777; }
.details-hero h1 { font-size: 32px; font-weight: 800; color: #fff; margin: 0 0 12px; }
.details-hero p { color: #999; font-size: 14px; line-height: 1.6; margin: 0 0 25px; max-width: 700px; }
.contest-actions-wrapper { display: flex; align-items: center; gap: 14px; }
.contest-join-btn, .contest-enter-btn { padding: 12px 28px; border: 0; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
.contest-join-btn { background: #ffc107; color: #111; }
.contest-join-btn:hover:not(:disabled) { background: #ffca28; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 193, 7, 0.25); }
.contest-join-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #444; color: #aaa; }
.contest-enter-btn { background: #28c76f; color: #fff; }
.contest-enter-btn:hover { background: #34d87b; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(40, 199, 111, 0.25); }
.contest-leave-btn { padding: 11px 20px; border: 1px solid #444; background: transparent; color: #aaa; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.contest-leave-btn:hover { border-color: #ff4d4f; color: #ff4d4f; background: rgba(255, 77, 79, 0.08); }
.details-section { margin-bottom: 35px; }
.details-section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.section-line { width: 4px; height: 32px; background: #ffc107; border-radius: 2px; }
.details-section-title h2 { margin: 0; font-size: 18px; color: #fff; font-weight: 700; }
.details-section-title p { margin: 2px 0 0; font-size: 12px; color: #666; }
.details-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.info-card { background: #161616; border: 1px solid #282828; padding: 18px; border-radius: 10px; display: flex; align-items: center; gap: 14px; }
.info-card-icon { width: 38px; height: 38px; border-radius: 8px; background: #222; display: flex; align-items: center; justify-content: center; color: #ffc107; font-size: 14px; }
.info-label { display: block; font-size: 10px; color: #666; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 3px; }
.info-card strong { font-size: 13px; color: #eee; }
.about-card { background: #161616; border: 1px solid #282828; border-radius: 10px; padding: 22px; display: flex; gap: 18px; }
.about-icon { color: #ffc107; font-size: 18px; }
.contest-description-full { color: #aaa; font-size: 13px; line-height: 1.7; }
.contest-problems { display: flex; flex-direction: column; gap: 10px; }
.problem-card { background: #161616; border: 1px solid #282828; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s ease; }
.problem-card:hover { border-color: #ffc107; transform: translateX(3px); background: #1c1c1c; }
.problem-number { font-family: monospace; font-size: 13px; font-weight: 800; color: #ffc107; width: 32px; }
.problem-main { flex: 1; }
.problem-title { font-size: 14px; font-weight: 600; color: #eee; }
.problem-meta { font-size: 11px; color: #666; }
.problem-points { text-align: right; }
.points-label { display: block; font-size: 9px; color: #666; font-weight: 700; }
.problem-points strong { color: #ffc107; font-size: 13px; }
.problem-arrow { color: #555; font-size: 16px; }
.problem-card:hover .problem-arrow { color: #ffc107; }
.problems-placeholder { background: #151515; border: 1px dashed #303030; border-radius: 10px; padding: 50px; text-align: center; }
.placeholder-icon { font-size: 24px; color: #666; margin-bottom: 12px; }
.problems-placeholder h3 { margin: 0 0 6px; color: #ddd; font-size: 15px; }
.problems-placeholder p { margin: 0; color: #666; font-size: 12px; }
.contest-state { text-align: center; padding: 80px 20px; background: #151515; border: 1px dashed #303030; border-radius: 12px; }
.state-icon { font-size: 28px; color: #666; margin-bottom: 12px; }
.state-icon.error { color: #ff4d4f; }
.contest-state h3 { margin: 0 0 8px; color: #eee; font-size: 18px; }
.contest-state p { margin: 0 0 16px; color: #777; font-size: 13px; }
.contest-retry { background: #ffc107; border: 0; padding: 8px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; color: #111; }
.loading-spinner { width: 22px; height: 22px; border: 2px solid #333; border-top-color: #ffc107; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.contest-loading, .details-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 80px; color: #777; font-size: 13px; }
@media (max-width: 900px) { .details-info-grid { grid-template-columns: repeat(2, 1fr); } .contest-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .details-info-grid { grid-template-columns: 1fr; } .contest-hero { padding: 25px; flex-direction: column; } .hero-decoration { display: none; } }
.contest-leaderboard {
    width: 100%;
    overflow-x: auto;
}

.leaderboard-table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid rgba(255, 193, 7, 0.12);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
}

.leaderboard-table {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
}

.leaderboard-table th {
    padding: 14px 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    background: rgba(255, 255, 255, 0.025);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.leaderboard-table td {
    padding: 16px;
    color: #ddd;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 14px;
}

.leaderboard-table tbody tr:last-child td {
    border-bottom: none;
}

.leaderboard-table tbody tr:hover {
    background: rgba(255, 193, 7, 0.04);
}

.leaderboard-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 30px;
    padding: 0 8px;
    border-radius: 8px;
    background: rgba(255, 193, 7, 0.08);
    color: #ffc107;
    font-weight: 700;
}

.leaderboard-user {
    font-weight: 600;
    color: #f1f1f1;
}

.leaderboard-score {
    color: #ffc107;
    font-size: 15px;
}

.leaderboard-loading {
    min-height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #888;
}

.leaderboard-loading .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 193, 7, 0.2);
    border-top-color: #ffc107;
    border-radius: 50%;
    animation: leaderboard-spin 0.8s linear infinite;
}

@keyframes leaderboard-spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
        `);
	}
}
