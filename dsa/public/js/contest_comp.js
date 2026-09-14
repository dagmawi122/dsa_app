

class ContestComp {
	constructor(wrapper, contest_name) {
        this.wrapper = wrapper;
        this.contest_name = contest_name;

        this.countdown_interval = null;
        this.refresh_interval = null;
        this._toast_timer = null;
        this._leaderboard_esc_handler = null;

        this.add_styles();

        if (this.contest_name) {
            this.render_skeleton();
            this.load_contest();
        } else {
            this.render_error("No contest selected.", { type: "not-found" });
        }
    }

	handle_route_change(contest_name) {
		if (!contest_name || contest_name === this.contest_name) {
			// Same contest re-shown: do a quiet refresh, no skeleton flash.
			this.load_contest({ silent: true });
			return;
		}

		this.clear_timers();
		this.contest_name = contest_name;
		this.render_skeleton();
		this.load_contest();
	}

	// ---------- DATA LOADING ----------

	async load_contest(opts = {}) {
		const silent = !!opts.silent;

		try {
			const [contestRes, progressRes] = await Promise.all([
				frappe.call({
					method: "dsa.api.get_contest",
					args: { name: this.contest_name },
				}),
				frappe.session.user !== "Guest"
					? frappe
							.call({
								method: "dsa.api.get_contest_progress",
								args: { contest: this.contest_name },
							})
							.catch(() => ({ message: null }))
					: Promise.resolve({ message: null }),
			]);

			if (!contestRes.message) {
				this.render_error("Contest not found.", { type: "not-found" });
				return;
			}

			this.contest = contestRes.message;
			this.progress = progressRes?.message || null;
			this.render_contest(this.contest, this.progress);
		} catch (error) {
			console.error("Failed to load contest:", error);

			if (!silent) {
				this.render_error(
					"Unable to load contest. Check your connection and try again.",
					{ type: "error", retry: true }
				);
			}
			// Silent background refreshes fail quietly — the user keeps
			// looking at the last good state instead of an error screen.
		}
	}

	// ---------- SKELETON / LOADING STATE ----------

	render_skeleton() {
		$(this.wrapper).find(".contest-comp-page").remove();

		$(this.wrapper).html(`
            <div class="contest-comp-page">
                <div class="comp-skeleton-hero"></div>

                <div class="comp-skeleton-info-grid">
                    <div class="comp-skeleton-card"></div>
                    <div class="comp-skeleton-card"></div>
                    <div class="comp-skeleton-card"></div>
                    <div class="comp-skeleton-card"></div>
                </div>

                <div class="comp-skeleton-problem"></div>
                <div class="comp-skeleton-problem"></div>
                <div class="comp-skeleton-problem"></div>
            </div>
        `);
	}

	// ---------- MAIN RENDER ----------

	render_contest(contest, progress) {
		this.clear_timers();

		const status = contest.status || "Upcoming";
		const type = this.status_class(status);
		const problems = contest.problems || [];
		const isGuest = frappe.session.user === "Guest";

		this.current_status_type = type;

		const startDateObj = this.parse_datetime(contest.start_date);
		const endDateObj = this.parse_datetime(contest.end_date);

		const startDate = contest.start_date
			? frappe.datetime.str_to_user(contest.start_date)
			: "—";

		const endDate = contest.end_date
			? frappe.datetime.str_to_user(contest.end_date)
			: "—";

		const totalPoints = problems.reduce(
			(total, problem) => total + (Number(problem.points) || 0),
			0
		);

		const myScore = progress ? progress.total_score || 0 : 0;
		const solvedCount = progress ? progress.solved_count || 0 : 0;
		const progressPct = problems.length
			? Math.round((solvedCount / problems.length) * 100)
			: 0;

		const solvedSet = new Set(progress?.solved || []);
		const attemptedSet = new Set(progress?.attempted || []);

		// Countdown target: "starts in" for upcoming, "ends in" for running.
		let countdownTarget = null;
		let countdownLabel = "";

		if (type === "upcoming" && startDateObj) {
			countdownTarget = startDateObj;
			countdownLabel = "STARTS IN";
		} else if (type === "running" && endDateObj) {
			countdownTarget = endDateObj;
			countdownLabel = "ENDS IN";
		}

		const countdownHtml = countdownTarget
			? `
                <div class="comp-countdown">
                    <span class="comp-countdown-label">${countdownLabel}</span>
                    <span class="comp-countdown-value">—</span>
                </div>
            `
			: "";

		const scoreCardHtml = isGuest
			? `
                <div class="comp-info-card highlight-card score-card">
                    <div class="comp-info-icon score-icon">
                        ${this.icon("login")}
                    </div>
                    <div>
                        <span class="info-label">MY SCORE / TOTAL</span>
                        <strong class="score-text-muted">Log in to track</strong>
                    </div>
                </div>
            `
			: `
                <div class="comp-info-card highlight-card score-card">
                    <div class="comp-info-icon score-icon">
                        ${this.icon("star")}
                    </div>
                    <div>
                        <span class="info-label">MY SCORE / TOTAL</span>
                        <strong class="score-text">${myScore} <small>/ ${totalPoints} PTS</small></strong>
                    </div>
                </div>
            `;

		const progressCardHtml = isGuest
			? `
                <div class="comp-info-card highlight-card progress-card">
                    <div class="comp-info-icon progress-icon">
                        ${this.icon("login")}
                    </div>
                    <div class="progress-card-body">
                        <span class="info-label">PROGRESS</span>
                        <strong>Log in to see</strong>
                    </div>
                </div>
            `
			: `
                <div class="comp-info-card highlight-card progress-card">
                    <div class="comp-info-icon progress-icon">
                        ${this.icon("check")}
                    </div>
                    <div class="progress-card-body">
                        <span class="info-label">PROGRESS</span>
                        <strong>${solvedCount} / ${problems.length} <small>Solved</small></strong>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" style="width:${progressPct}%"></div>
                        </div>
                    </div>
                </div>
            `;

		const guestBannerHtml = isGuest
			? `
                <div class="comp-guest-banner">
                    <div class="comp-guest-banner-icon">
                        ${this.icon("login")}
                    </div>
                    <div class="comp-guest-banner-text">
                        <strong>You're browsing as a guest.</strong>
                        <span>Log in to track your progress and submit solutions.</span>
                    </div>
                    <button class="comp-guest-login-btn">Log In</button>
                </div>
            `
			: "";

		$(this.wrapper).find(".contest-comp-page").remove();
		$(this.wrapper).html(`
            <div class="contest-comp-page">
                <!-- HERO -->
                <section class="comp-hero ${type}">
                    <div class="comp-hero-content">
                        <div class="comp-top-row">
                            <div class="comp-top-row-left">
                                <button class="comp-back-btn">
                                    <span>←</span>
                                    Back to Contest Overview
                                </button>

                                <button class="comp-leaderboard-btn">
                                    ${this.icon("trophy")}
                                    Leaderboard
                                </button>
                            </div>

                            <span class="contest-status ${type}">
                                <span class="status-dot"></span>
                                ${this.get_status_label(type)}
                            </span>
                        </div>

                        <div class="comp-title-block">
                            <span class="comp-eyebrow">CONTEST</span>

                            <h1>
                                ${this.escape_html(contest.title || contest.name)}
                            </h1>

                            <div class="comp-description">
                                ${contest.description || "Test your problem-solving skills."}
                            </div>

                            ${countdownHtml}
                        </div>
                    </div>

                    <div class="comp-hero-decoration">
                        <span>{ }</span>
                    </div>
                </section>

                ${guestBannerHtml}

                <!-- CONTEST INFO & PROGRESS -->
                <section class="comp-info-section">
                    <div class="comp-info-grid">
                        <div class="comp-info-card">
                            <div class="comp-info-icon">
                                ${this.icon("play")}
                            </div>
                            <div>
                                <span class="info-label">STARTS</span>
                                <strong>${this.escape_html(startDate)}</strong>
                            </div>
                        </div>

                        <div class="comp-info-card">
                            <div class="comp-info-icon">
                                ${this.icon("stop")}
                            </div>
                            <div>
                                <span class="info-label">ENDS</span>
                                <strong>${this.escape_html(endDate)}</strong>
                            </div>
                        </div>

                        ${scoreCardHtml}
                        ${progressCardHtml}
                    </div>
                </section>

                <!-- PROBLEMS -->
                <section class="comp-problems-section">
                    <div class="comp-section-heading">
                        <div class="comp-section-title-wrapper">
                            <div class="comp-section-icon">
                                ${this.icon("code")}
                            </div>
                            <div>
                                <h2>Contest Problems</h2>
                                <p>${this.get_problems_subtitle(type)}</p>
                            </div>
                        </div>

                        <span class="comp-problem-count">
                            ${problems.length}
                            <small>${problems.length === 1 ? "Problem" : "Problems"}</small>
                        </span>
                    </div>

                    <div class="comp-problem-list ${type !== "running" ? "is-locked" : ""}">
                        ${
							problems.length
								? problems
										.sort(
											(a, b) =>
												(Number(a.order) || 0) - (Number(b.order) || 0)
										)
										.map((problem, index) =>
											this.render_problem(
												problem,
												index,
												solvedSet.has(problem.problem),
												attemptedSet.has(problem.problem),
												type
											)
										)
										.join("")
								: `
                                    <div class="comp-empty-state">
                                        <div class="placeholder-icon">
                                            ${this.icon("inbox")}
                                        </div>
                                        <h3>No problems yet</h3>
                                        <p>Problems for this contest haven't been added yet.</p>
                                    </div>
                                `
						}
                    </div>
                </section>
            </div>
        `);

		this.bind_events();

		if (countdownTarget) {
			this.start_countdown(countdownTarget);
		}

		this.start_background_refresh();
	}

	get_problems_subtitle(type) {
		if (type === "ended") {
			return "This contest has ended. Problems are now view-only.";
		}

		if (type === "upcoming") {
			return "This contest hasn't started yet. Check back when it opens.";
		}

		return "Choose a problem to start solving in the code editor.";
	}

	render_problem(problem, index, isSolved, isAttempted, contestType) {
		const number = String(index + 1).padStart(2, "0");
		const points = Number(problem.points) || 0;
		const title = problem.title || problem.problem;

		let statusPill = `<span class="problem-status-pill unsolved">${this.icon(
			"circle"
		)} Unsolved</span>`;
		let statusText = "unsolved";

		if (isSolved) {
			statusPill = `<span class="problem-status-pill solved">${this.icon(
				"check"
			)} Solved</span>`;
			statusText = "solved";
		} else if (isAttempted) {
			statusPill = `<span class="problem-status-pill attempted">${this.icon(
				"clock"
			)} Attempted</span>`;
			statusText = "attempted";
		}

		const lockedSuffix =
			contestType === "ended"
				? ", contest ended, view only"
				: contestType === "upcoming"
				? ", contest hasn't started yet"
				: "";

		return `
            <div
                class="comp-problem-card ${isSolved ? "is-solved" : ""}"
                data-problem="${this.escape_html(problem.problem)}"
                tabindex="0"
                role="button"
                aria-label="${this.escape_html(title)}, ${points} points, ${statusText}${lockedSuffix}"
            >
                <div class="comp-problem-number">
                    ${isSolved ? this.icon("check") : number}
                </div>

                <div class="comp-problem-main">
                    <div class="comp-problem-title-row">
                        <div class="comp-problem-title">
                            ${this.escape_html(title)}
                        </div>
                        ${statusPill}
                    </div>

                    <div class="comp-problem-meta">
                        <span class="problem-tag">Challenge ${number}</span>
                    </div>
                </div>

                <div class="comp-problem-points">
                    <span>${points}</span>
                    <small>PTS</small>
                </div>

                <div class="comp-problem-arrow">
                    →
                </div>
            </div>
        `;
	}

	// ---------- EVENTS ----------

	bind_events() {
		$(this.wrapper)
        .find(".comp-back-btn")
        .off("click")
        .on("click", () => {
            window.location.href = `/contest-page/${encodeURIComponent(this.contest_name)}`;
        });

		$(this.wrapper)
			.find(".comp-leaderboard-btn")
			.off("click")
			.on("click", () => {
				this.open_leaderboard_modal();
			});

		$(this.wrapper)
			.find(".comp-guest-login-btn")
			.off("click")
			.on("click", () => {
				frappe.set_route("login");
			});

		const $cards = $(this.wrapper).find(".comp-problem-card");

		$cards.off("click").on("click", (event) => {
			this.handle_problem_activate(event.currentTarget);
		});

		$cards.off("keydown").on("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				this.handle_problem_activate(event.currentTarget);
			}
		});
	}

	handle_problem_activate(cardEl) {
		const problem = $(cardEl).data("problem");
		if (!problem) return;

		if (this.current_status_type === "ended") {
			this.show_status_toast(
				"error",
				"Contest has ended!",
				"You can no longer submit solutions for this contest."
			);
			return;
		}

		if (this.current_status_type === "upcoming") {
			this.show_status_toast(
				"warning",
				"Contest hasn't started yet!",
				"Come back once the countdown reaches zero."
			);
			return;
		}

		window.location.href =
	        `/contest-solve/${encodeURIComponent(this.contest_name)}/${encodeURIComponent(problem)}`;
	}

	// ---------- LEADERBOARD MODAL ----------

	open_leaderboard_modal() {
		// Guard against double-opens (e.g. rapid double click).
		this.close_leaderboard_modal();

		const isGuest = frappe.session.user === "Guest";

		const $modal = $(`
            <div class="comp-modal-overlay" role="dialog" aria-modal="true" aria-label="Contest Leaderboard">
                <div class="comp-modal">
                    <div class="comp-modal-header">
                        <div class="comp-modal-title">
                            ${this.icon("trophy")}
                            <span>Leaderboard</span>
                        </div>
                        <button class="comp-modal-close" aria-label="Close leaderboard">&times;</button>
                    </div>
                    <div class="comp-modal-body">
                        ${
							isGuest
								? `
                                <div class="comp-modal-state">
                                    <div class="state-icon">${this.icon("login")}</div>
                                    <h3>Log in to view the leaderboard</h3>
                                    <p>Sign in and join the contest to see live rankings.</p>
                                    <button class="comp-modal-login-btn">Log In</button>
                                </div>
                            `
								: `
                                <div class="comp-leaderboard-loading">
                                    <div class="comp-leaderboard-skel-row"></div>
                                    <div class="comp-leaderboard-skel-row"></div>
                                    <div class="comp-leaderboard-skel-row"></div>
                                    <div class="comp-leaderboard-skel-row"></div>
                                    <div class="comp-leaderboard-skel-row"></div>
                                </div>
                            `
						}
                    </div>
                </div>
            </div>
        `);

		$(this.wrapper).append($modal);

		requestAnimationFrame(() => $modal.addClass("show"));

		$modal.find(".comp-modal-close").on("click", () => this.close_leaderboard_modal());

		// Click on the backdrop (not the modal card itself) closes it.
		$modal.on("click", (event) => {
			if (event.target === $modal[0]) this.close_leaderboard_modal();
		});

		$modal.find(".comp-modal-login-btn").on("click", () => frappe.set_route("login"));

		this._leaderboard_esc_handler = (event) => {
			if (event.key === "Escape") this.close_leaderboard_modal();
		};
		$(document).on("keydown", this._leaderboard_esc_handler);

		if (!isGuest) {
			this.load_leaderboard();
		}
	}

	close_leaderboard_modal() {
		const $modal = $(this.wrapper).find(".comp-modal-overlay");
		if (!$modal.length) return;

		if (this._leaderboard_esc_handler) {
			$(document).off("keydown", this._leaderboard_esc_handler);
			this._leaderboard_esc_handler = null;
		}

		$modal.removeClass("show");
		setTimeout(() => $modal.remove(), 200);
	}

	async load_leaderboard() {
		try {
			const res = await frappe.call({
				method: "dsa.api.get_contest_leaderboard",
				args: { contest: this.contest_name },
			});

			// The modal may have been closed while the request was in flight.
			const $modal = $(this.wrapper).find(".comp-modal-overlay");
			if (!$modal.length) return;

			const leaderboard = res.message?.leaderboard || [];
			this.render_leaderboard_body($modal, leaderboard);
		} catch (error) {
			console.error("Failed to load leaderboard:", error);

			const $modal = $(this.wrapper).find(".comp-modal-overlay");
			if (!$modal.length) return;

			$modal.find(".comp-modal-body").html(`
                <div class="comp-modal-state">
                    <div class="state-icon error">${this.icon("warning")}</div>
                    <h3>Unable to load leaderboard</h3>
                    <p>Check your connection and try again.</p>
                    <button class="comp-modal-retry-btn">Try Again</button>
                </div>
            `);

			$modal.find(".comp-modal-retry-btn").on("click", () => this.load_leaderboard());
		}
	}

	render_leaderboard_body($modal, leaderboard) {
		const currentUser = frappe.session.user;

		if (!leaderboard.length) {
			$modal.find(".comp-modal-body").html(`
                <div class="comp-modal-state">
                    <div class="state-icon">${this.icon("inbox")}</div>
                    <h3>No rankings yet</h3>
                    <p>Rankings will appear once participants start solving problems.</p>
                </div>
            `);
			return;
		}

		const medal = { 1: "🥇", 2: "🥈", 3: "🥉" };

		const rowsHtml = leaderboard
			.map((row) => {
				const isMe = row.member === currentUser;
				const displayName = row.full_name || row.member;

				return `
                    <div class="comp-lb-row ${isMe ? "is-me" : ""}">
                        <div class="comp-lb-rank">
                            ${
								medal[row.rank]
									? `<span class="comp-lb-medal">${medal[row.rank]}</span>`
									: `<span>${row.rank}</span>`
							}
                        </div>
                        <div class="comp-lb-name">
                            <span class="comp-lb-name-text">${this.escape_html(displayName)}</span>
                            ${isMe ? `<span class="comp-lb-you-tag">You</span>` : ""}
                        </div>
                        <div class="comp-lb-solved">${row.solved_count}</div>
                        <div class="comp-lb-time">${this.format_solve_duration(
							row.total_solving_time
						)}</div>
                        <div class="comp-lb-score">${row.total_score}</div>
                    </div>
                `;
			})
			.join("");

		$modal.find(".comp-modal-body").html(`
            <div class="comp-lb-table">
                <div class="comp-lb-row comp-lb-head">
                    <div class="comp-lb-rank">#</div>
                    <div class="comp-lb-name">Participant</div>
                    <div class="comp-lb-solved">Solved</div>
                    <div class="comp-lb-time">Time</div>
                    <div class="comp-lb-score">Score</div>
                </div>
                ${rowsHtml}
            </div>
        `);
	}

	format_solve_duration(seconds) {
		const totalSec = Math.max(0, Math.floor(Number(seconds) || 0));

		if (!totalSec) return "—";

		const hours = Math.floor(totalSec / 3600);
		const mins = Math.floor((totalSec % 3600) / 60);
		const secs = totalSec % 60;

		const parts = [];
		if (hours) parts.push(`${hours}h`);
		if (hours || mins) parts.push(`${mins}m`);
		parts.push(`${secs}s`);

		return parts.join(" ");
	}

	// ---------- TOAST ----------

	show_status_toast(type, title, message) {
		$(this.wrapper).find(".comp-status-toast").remove();
		clearTimeout(this._toast_timer);

		const iconName = type === "error" ? "warning" : type === "warning" ? "clock" : "info";

		const $toast = $(`
            <div class="comp-status-toast toast-${type}" role="alert" aria-live="assertive">
                <div class="comp-status-toast-icon">
                    ${this.icon(iconName)}
                </div>
                <div class="comp-status-toast-text">
                    <strong>${this.escape_html(title)}</strong>
                    <span>${this.escape_html(message)}</span>
                </div>
            </div>
        `);

		$(this.wrapper).find(".contest-comp-page").append($toast);

		requestAnimationFrame(() => $toast.addClass("show"));

		this._toast_timer = setTimeout(() => {
			$toast.removeClass("show");
			setTimeout(() => $toast.remove(), 250);
		}, 3200);
	}

	// ---------- COUNTDOWN ----------

	start_countdown(targetDate) {
		this.clear_countdown();

		const tick = () => {
			const $value = $(this.wrapper).find(".comp-countdown-value");
			if (!$value.length) {
				this.clear_countdown();
				return;
			}

			const diff = targetDate.getTime() - Date.now();

			if (diff <= 0) {
				this.clear_countdown();
				// Contest just transitioned (started or ended) — refresh quietly.
				this.load_contest({ silent: true });
				return;
			}

			$value.text(this.format_duration(diff));
		};

		tick();
		this.countdown_interval = setInterval(tick, 1000);
	}

	clear_countdown() {
		if (this.countdown_interval) {
			clearInterval(this.countdown_interval);
			this.countdown_interval = null;
		}
	}

	format_duration(ms) {
		let totalSec = Math.floor(ms / 1000);
		const days = Math.floor(totalSec / 86400);
		totalSec %= 86400;
		const hours = Math.floor(totalSec / 3600);
		totalSec %= 3600;
		const mins = Math.floor(totalSec / 60);
		const secs = totalSec % 60;

		const parts = [];
		if (days) parts.push(`${days}d`);
		if (days || hours) parts.push(`${hours}h`);
		if (days || hours || mins) parts.push(`${mins}m`);
		parts.push(`${secs}s`);

		return parts.join(" ");
	}

	parse_datetime(str) {
		if (!str) return null;
		// Frappe returns "YYYY-MM-DD HH:mm:ss[.ffffff]" — normalize to
		// an ISO-ish string JS can parse reliably.
		const cleaned = str.replace(" ", "T").split(".")[0];
		const d = new Date(cleaned);
		return isNaN(d.getTime()) ? null : d;
	}

	// ---------- BACKGROUND POLLING ----------

	start_background_refresh() {
		this.clear_background_refresh();
		this.refresh_interval = setInterval(() => {
			this.load_contest({ silent: true });
		}, 30000);
	}

	clear_background_refresh() {
		if (this.refresh_interval) {
			clearInterval(this.refresh_interval);
			this.refresh_interval = null;
		}
	}

	clear_timers() {
		this.clear_countdown();
		this.clear_background_refresh();
		clearTimeout(this._toast_timer);
		this.close_leaderboard_modal();
	}

	// ---------- ERROR STATE ----------

	render_error(message, opts = {}) {
		this.clear_timers();

		const { type = "error", retry = false } = opts;
		const heading = type === "not-found" ? "Contest not found" : "Unable to load contest";

		$(this.wrapper).html(`
            <div class="contest-comp-page">
                <button class="comp-back-btn standalone">
                    <span>←</span> Back to Contests
                </button>

                <div class="comp-state">
                    <div class="state-icon error">
                        ${this.icon("warning")}
                    </div>
                    <h2>${this.escape_html(heading)}</h2>
                    <p>${this.escape_html(message)}</p>
                    ${retry ? `<button class="comp-retry-btn">Try Again</button>` : ""}
                </div>
            </div>
        `);

		$(this.wrapper)
			.find(".comp-back-btn")
			.on("click", () => {
				frappe.set_route("contest-page");
			});

		if (retry) {
			$(this.wrapper)
				.find(".comp-retry-btn")
				.on("click", () => {
					this.render_skeleton();
					this.load_contest();
				});
		}
	}

	// ---------- HELPERS ----------

	status_class(status) {
		const s = (status || "").toLowerCase();

		if (s === "active") return "running";
		if (s === "upcoming") return "upcoming";

		return "ended";
	}

	get_status_label(type) {
		if (type === "running") return "Running";
		if (type === "upcoming") return "Upcoming";

		return "Ended";
	}

	escape_html(str) {
		return frappe.utils.escape_html(str || "");
	}

	// Self-contained inline SVG icons so the UI never depends on an
	// external icon font (FontAwesome) being loaded/available.
	icon(name) {
		const icons = {
			play: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
			stop: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>`,
			star: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.7z"/></svg>`,
			check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.5 5.5L20 6"/></svg>`,
			code: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>`,
			inbox: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16l2 9v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z"/><path d="M2 13h5.5a2.5 2.5 0 0 0 5 0H22"/></svg>`,
			warning: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L2 20.5h20z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none"/></svg>`,
			circle: `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/></svg>`,
			clock: `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`,
			trophy: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4v1a4 4 0 0 0 4 4"/><path d="M16 5h4v1a4 4 0 0 1-4 4"/><path d="M10 15h4v3h-4z"/><path d="M8 21h8"/><path d="M10 18h4v0h-4z"/></svg>`,
			login: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
			info: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/></svg>`,
		};

		return `<span class="comp-icon comp-icon-${name}">${icons[name] || ""}</span>`;
	}

	add_styles() {
		if ($("#contest-comp-styles").length) return;

		$("head").append(`
<style id="contest-comp-styles">

/* Theme-aware colors: reads Frappe's theme variables so the page
   follows whatever light/dark mode is currently active. */

.contest-comp-page {
    --accent: #f5a800;
    --accent-2: #ffcd39;
    --accent-ink: #1a1400;
    --accent-soft: rgba(245, 168, 0, 0.13);
    --accent-soft-strong: rgba(245, 168, 0, 0.22);
    --green: var(--text-on-green, #1f9d5c);
    --green-2: #34d180;
    --green-soft: rgba(31, 157, 92, 0.13);
    --red: var(--text-on-red, #e6484a);
    --red-soft: rgba(230, 72, 74, 0.1);
    --blue: var(--text-on-blue, #2f6fed);
    --blue-soft: rgba(47, 111, 237, 0.12);
    --card-shadow: 0 1px 2px rgba(15, 15, 15, 0.04), 0 8px 24px rgba(15, 15, 15, 0.05);
    --card-shadow-hover: 0 2px 4px rgba(15, 15, 15, 0.06), 0 16px 36px rgba(15, 15, 15, 0.09);
}

.comp-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
}

.comp-icon svg {
    display: block;
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

.contest-comp-page {
    position: relative;
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

/* SKELETON LOADING STATE */

.comp-skeleton-hero,
.comp-skeleton-card,
.comp-skeleton-problem {
    border-radius: 14px;
    background: linear-gradient(
        100deg,
        var(--card-bg) 40%,
        var(--control-bg) 50%,
        var(--card-bg) 60%
    );
    background-size: 200% 100%;
    animation: comp-shimmer 1.4s ease-in-out infinite;
    border: 1px solid var(--border-color);
}

.comp-skeleton-hero {
    height: 200px;
    border-radius: 18px;
    margin-bottom: 30px;
}

.comp-skeleton-info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 35px;
}

.comp-skeleton-card {
    height: 70px;
}

.comp-skeleton-problem {
    height: 64px;
    margin-bottom: 10px;
}

@keyframes comp-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* HERO */

.comp-hero {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 36px 40px;
    border-radius: 18px;
    background: linear-gradient(155deg, var(--card-bg) 0%, var(--card-bg) 60%, var(--accent-soft) 170%);
    border: 1px solid var(--border-color);
    margin-bottom: 30px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
}

.comp-hero.running {
    background: linear-gradient(155deg, var(--card-bg) 0%, var(--card-bg) 55%, var(--green-soft) 170%);
}

.comp-hero::before {
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

.comp-hero-content {
    position: relative;
    z-index: 1;
    flex: 1;
}

.comp-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 22px;
    flex-wrap: wrap;
    gap: 10px;
}

.comp-top-row-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.comp-back-btn,
.comp-leaderboard-btn {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 9px 18px;
    border-radius: 9px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    box-shadow: var(--card-shadow);
}

.comp-back-btn:hover,
.comp-leaderboard-btn:hover {
    background: var(--control-bg);
}

.comp-back-btn:hover {
    transform: translateX(-2px);
}

.comp-leaderboard-btn {
    color: var(--accent);
    border-color: var(--accent-soft-strong);
}

.comp-back-btn.standalone {
    margin-bottom: 25px;
}

.contest-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
}

.contest-status.running {
    background: var(--green-soft);
    color: var(--green);
}

.contest-status.upcoming {
    background: var(--accent-soft);
    color: var(--accent);
}

.contest-status.ended {
    background: var(--control-bg);
    color: var(--text-muted);
}

.status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
}

.comp-eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.comp-hero h1 {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0 0 10px;
    background: linear-gradient(90deg, var(--text-color), var(--text-color) 60%, var(--accent));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.comp-description {
    color: var(--text-muted);
    font-size: 14px;
    margin: 0;
    line-height: 1.6;
    max-width: 700px;
}

.comp-description .ql-editor {
    padding: 0;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.6;
}

.comp-description .ql-editor p {
    margin: 0 0 10px;
}

.comp-description .ql-editor p:last-child {
    margin-bottom: 0;
}

.comp-countdown {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 16px;
    padding: 8px 14px;
    border-radius: 9px;
    background: var(--control-bg);
    border: 1px solid var(--border-color);
}

.comp-countdown-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: var(--text-muted);
}

.comp-countdown-value {
    font-family: var(--font-stack-monospace, monospace);
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
}

.comp-hero-decoration {
    position: relative;
    z-index: 1;
    color: var(--accent);
    font-size: 30px;
    font-family: var(--font-stack-monospace, monospace);
    font-weight: 800;
    border: 2px solid var(--border-color);
    background: var(--control-bg);
    padding: 14px 22px;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    transform: rotate(-4deg);
}

/* GUEST BANNER */

.comp-guest-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 20px;
    border-radius: 12px;
    background: var(--blue-soft);
    border: 1px solid rgba(47, 111, 237, 0.25);
    margin-bottom: 25px;
}

.comp-guest-banner-icon {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(47, 111, 237, 0.18);
    color: var(--blue);
    display: flex;
    align-items: center;
    justify-content: center;
}

.comp-guest-banner-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.comp-guest-banner-text strong {
    font-size: 13px;
    color: var(--text-color);
}

.comp-guest-banner-text span {
    font-size: 12px;
    color: var(--text-muted);
}

.comp-guest-login-btn {
    flex-shrink: 0;
    background: var(--blue);
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s ease;
}

.comp-guest-login-btn:hover {
    opacity: 0.88;
}

/* INFO / PROGRESS */

.comp-info-section {
    margin-bottom: 35px;
}

.comp-info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
}

.comp-info-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    padding: 18px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: var(--card-shadow);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.comp-info-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-shadow-hover);
}

.comp-info-card.highlight-card {
    background: linear-gradient(155deg, var(--card-bg), var(--accent-soft));
    border-color: var(--accent-soft-strong);
}

.comp-info-card.score-card {
    background: linear-gradient(155deg, var(--card-bg), var(--accent-soft));
}

.comp-info-card.progress-card {
    background: linear-gradient(155deg, var(--card-bg), var(--green-soft));
    border-color: var(--green-soft);
    align-items: flex-start;
}

.comp-info-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(155deg, var(--accent-soft), var(--control-bg));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    font-size: 14px;
    flex-shrink: 0;
}

.score-icon {
    background: var(--accent-soft-strong);
    color: var(--accent);
}

.progress-icon {
    background: var(--green-soft);
    color: var(--green);
}

.info-label {
    display: block;
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 700;
    letter-spacing: 0.6px;
    margin-bottom: 3px;
}

.comp-info-card strong {
    font-size: 14px;
    color: var(--text-color);
}

.comp-info-card strong small {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
}

.score-text {
    color: var(--accent) !important;
    font-size: 16px !important;
}

.score-text-muted {
    color: var(--text-muted) !important;
    font-size: 13px !important;
}

.progress-card-body {
    width: 100%;
}

.progress-bar-track {
    margin-top: 8px;
    width: 100%;
    height: 6px;
    border-radius: 4px;
    background: var(--control-bg);
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--green), var(--green-2));
    transition: width 0.3s ease;
}

/* PROBLEMS */

.comp-problems-section {
    margin-bottom: 40px;
}

.comp-section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.comp-section-title-wrapper {
    display: flex;
    align-items: center;
    gap: 14px;
}

.comp-section-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: linear-gradient(155deg, var(--accent-soft), transparent);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.comp-section-heading h2 {
    margin: 0;
    font-size: 20px;
    color: var(--text-color);
    font-weight: 700;
    letter-spacing: -0.2px;
}

.comp-section-heading p {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-muted);
}

.comp-problem-count {
    font-size: 20px;
    font-weight: 800;
    color: var(--accent);
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.2;
}

.comp-problem-count small {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
}

.comp-problem-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.comp-problem-card {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px 20px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--card-bg);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--card-shadow);
}

.comp-problem-card:hover {
    transform: translateX(4px);
    border-color: var(--accent);
    box-shadow: var(--card-shadow-hover);
}

.comp-problem-card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.comp-problem-card.is-solved {
    border-color: var(--green-soft);
    background: linear-gradient(155deg, var(--card-bg), var(--green-soft));
}

.comp-problem-card.is-solved:hover {
    border-color: var(--green);
}

/* When the contest isn't currently running (ended or upcoming), problems
   are still clickable (to surface a status toast) but visually locked. */
.comp-problem-list.is-locked .comp-problem-card {
    cursor: not-allowed;
}

.comp-problem-list.is-locked .comp-problem-card:hover {
    transform: none;
    border-color: var(--border-color);
    box-shadow: var(--card-shadow);
}

.comp-problem-list.is-locked .comp-problem-card.is-solved:hover {
    border-color: var(--green-soft);
}

.comp-problem-list.is-locked .comp-problem-arrow {
    opacity: 0.35;
}

.comp-problem-number {
    font-family: var(--font-stack-monospace, monospace);
    font-size: 13px;
    font-weight: 800;
    color: var(--text-muted);
    width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.comp-problem-card.is-solved .comp-problem-number {
    color: var(--green);
    font-size: 15px;
}

.comp-problem-main {
    flex: 1;
    min-width: 0;
}

.comp-problem-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
    flex-wrap: wrap;
}

.comp-problem-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-color);
}

.problem-status-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.problem-status-pill.solved {
    background: var(--green-soft);
    color: var(--green);
}

.problem-status-pill.attempted {
    background: var(--accent-soft);
    color: var(--accent);
}

.problem-status-pill.unsolved {
    background: var(--control-bg);
    color: var(--text-muted);
}

.comp-problem-meta {
    font-size: 11px;
    color: var(--text-muted);
}

.comp-problem-points {
    text-align: right;
    min-width: 50px;
}

.comp-problem-points span {
    font-size: 15px;
    font-weight: 800;
    color: var(--accent);
    display: block;
}

.comp-problem-points small {
    font-size: 8px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.5px;
}

.comp-problem-arrow {
    color: var(--text-muted);
    font-size: 16px;
    transition: transform 0.2s ease, color 0.2s ease;
}

.comp-problem-card:hover .comp-problem-arrow {
    color: var(--accent);
    transform: translateX(3px);
}

/* EMPTY / ERROR STATES */

.comp-empty-state {
    padding: 60px;
    text-align: center;
    border: 1px dashed var(--border-color);
    border-radius: 14px;
    background: var(--card-bg);
}

.placeholder-icon {
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
}

.comp-empty-state h3 {
    margin: 0 0 6px;
    color: var(--text-color);
    font-size: 15px;
}

.comp-empty-state p {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
}

.comp-state {
    text-align: center;
    padding: 80px 20px;
    background: var(--card-bg);
    border: 1px dashed var(--border-color);
    border-radius: 14px;
}

.state-icon {
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
}

.state-icon.error {
    color: var(--red);
}

.comp-state h2 {
    margin: 0 0 8px;
    color: var(--text-color);
    font-size: 18px;
}

.comp-state p {
    margin: 0 0 18px;
    color: var(--text-muted);
    font-size: 13px;
}

.comp-retry-btn {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 9px 22px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s ease;
}

.comp-retry-btn:hover {
    opacity: 0.88;
}

/* STATUS TOAST (ended / upcoming / info) */

.comp-status-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translate(-50%, -16px);
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 380px;
    padding: 14px 18px;
    border-radius: 12px;
    background: var(--card-bg);
    box-shadow: var(--card-shadow-hover);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.22s ease, transform 0.22s ease;
    border: 1px solid var(--border-color);
}

.comp-status-toast.show {
    opacity: 1;
    transform: translate(-50%, 0);
}

.comp-status-toast.toast-error {
    border-color: var(--red-soft);
}

.comp-status-toast.toast-warning {
    border-color: var(--accent-soft-strong);
}

.comp-status-toast.toast-info {
    border-color: rgba(47, 111, 237, 0.25);
}

.comp-status-toast-icon {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toast-error .comp-status-toast-icon {
    background: var(--red-soft);
    color: var(--red);
}

.toast-warning .comp-status-toast-icon {
    background: var(--accent-soft);
    color: var(--accent);
}

.toast-info .comp-status-toast-icon {
    background: var(--blue-soft);
    color: var(--blue);
}

.comp-status-toast-icon svg {
    width: 17px;
    height: 17px;
}

.comp-status-toast-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.comp-status-toast-text strong {
    font-size: 13px;
    color: var(--text-color);
}

.comp-status-toast-text span {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
}

/* LEADERBOARD MODAL */

.comp-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 15, 0.45);
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 20px;
}

.comp-modal-overlay.show {
    opacity: 1;
}

.comp-modal {
    width: 100%;
    max-width: 640px;
    max-height: 82vh;
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow-hover);
    transform: translateY(10px) scale(0.98);
    transition: transform 0.2s ease;
    overflow: hidden;
}

.comp-modal-overlay.show .comp-modal {
    transform: translateY(0) scale(1);
}

.comp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.comp-modal-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 800;
    color: var(--text-color);
}

.comp-modal-title .comp-icon {
    color: var(--accent);
}

.comp-modal-close {
    background: var(--control-bg);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    width: 30px;
    height: 30px;
    border-radius: 8px;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.comp-modal-close:hover {
    color: var(--text-color);
    background: var(--border-color);
}

.comp-modal-body {
    padding: 18px 22px 22px;
    overflow-y: auto;
}

/* Leaderboard table */

.comp-lb-table {
    display: flex;
    flex-direction: column;
}

.comp-lb-row {
    display: grid;
    grid-template-columns: 44px 1fr 70px 90px 70px;
    align-items: center;
    gap: 10px;
    padding: 11px 10px;
    border-radius: 10px;
}

.comp-lb-row.comp-lb-head {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 4px;
}

.comp-lb-row:not(.comp-lb-head):hover {
    background: var(--control-bg);
}

.comp-lb-row.is-me {
    background: var(--accent-soft);
}

.comp-lb-row.is-me:hover {
    background: var(--accent-soft-strong);
}

.comp-lb-rank {
    font-weight: 800;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
}

.comp-lb-medal {
    font-size: 17px;
}

.comp-lb-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.comp-lb-name-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.comp-lb-you-tag {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 800;
    color: var(--accent);
    background: var(--accent-soft-strong);
    padding: 2px 6px;
    border-radius: 5px;
    text-transform: uppercase;
}

.comp-lb-solved,
.comp-lb-time,
.comp-lb-score {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-color);
    text-align: center;
}

.comp-lb-score {
    color: var(--accent);
    font-weight: 800;
}

/* Loading skeleton inside modal */

.comp-leaderboard-loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.comp-leaderboard-skel-row {
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(
        100deg,
        var(--card-bg) 40%,
        var(--control-bg) 50%,
        var(--card-bg) 60%
    );
    background-size: 200% 100%;
    animation: comp-shimmer 1.4s ease-in-out infinite;
    border: 1px solid var(--border-color);
}

/* Modal empty/error/guest state */

.comp-modal-state {
    text-align: center;
    padding: 40px 10px;
}

.comp-modal-state .state-icon {
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
}

.comp-modal-state .state-icon.error {
    color: var(--red);
}

.comp-modal-state h3 {
    margin: 0 0 6px;
    color: var(--text-color);
    font-size: 15px;
}

.comp-modal-state p {
    margin: 0 0 16px;
    color: var(--text-muted);
    font-size: 12px;
}

.comp-modal-login-btn,
.comp-modal-retry-btn {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 9px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s ease;
}

.comp-modal-login-btn:hover,
.comp-modal-retry-btn:hover {
    opacity: 0.88;
}

@media (max-width: 900px) {
    .comp-info-grid,
    .comp-skeleton-info-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .comp-info-grid,
    .comp-skeleton-info-grid {
        grid-template-columns: 1fr;
    }

    .comp-hero {
        padding: 24px;
        flex-direction: column;
    }

    .comp-hero-decoration {
        display: none;
    }

    .comp-problem-card {
        padding: 14px;
    }

    .comp-guest-banner {
        flex-wrap: wrap;
    }

    .comp-status-toast {
        left: 16px;
        right: 16px;
        transform: translateY(-16px);
        max-width: none;
    }

    .comp-status-toast.show {
        transform: translateY(0);
    }

    .comp-lb-row {
        grid-template-columns: 32px 1fr 55px 70px;
    }

    .comp-lb-time {
        display: none;
    }

    .comp-modal {
        max-height: 88vh;
    }
}

</style>
        `);
	}
}


window.ContestComp = ContestComp;
