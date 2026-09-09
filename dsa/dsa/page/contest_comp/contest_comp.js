frappe.pages["contest-comp"].on_page_load = function (wrapper) {
	new ContestComp(wrapper);
};

frappe.pages["contest-comp"].on_page_show = function (wrapper) {
	const route = frappe.get_route();
	const contest_name = route[1];

	if (wrapper.contest_comp_instance) {
		wrapper.contest_comp_instance.handle_route_change(contest_name);
	}
};

class ContestComp {
	constructor(wrapper) {
		this.wrapper = wrapper;
		wrapper.contest_comp_instance = this;

		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Contest",
			single_column: true,
		});

		this.contest_name = frappe.get_route()[1];
		this.add_styles();

		if (this.contest_name) {
			this.render();
			this.load_contest();
		} else {
			this.render_error("No contest selected.");
		}
	}

	handle_route_change(contest_name) {
		if (!contest_name || contest_name === this.contest_name) {
			this.load_contest();
			return;
		}

		this.contest_name = contest_name;
		this.render();
		this.load_contest();
	}

	render() {
		$(this.wrapper).find(".contest-comp-page").remove();

		$(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-comp-page">
                <div class="contest-comp-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading contest...</p>
                </div>
            </div>
        `);
	}

	async load_contest() {
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
				this.render_error("Contest not found.");
				return;
			}

			this.contest = contestRes.message;
			this.progress = progressRes?.message || null;
			this.render_contest(this.contest, this.progress);
		} catch (error) {
			console.error("Failed to load contest:", error);
			this.render_error("Unable to load contest.");
		}
	}

	render_contest(contest, progress) {
		const status = contest.status || "Upcoming";
		const type = this.status_class(status);
		const problems = contest.problems || [];

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

		$(this.wrapper).find(".contest-comp-page").html(`
            <!-- HERO -->
            <section class="comp-hero ${type}">
                <div class="comp-hero-content">
                    <div class="comp-top-row">
                        <button class="comp-back-btn">
                            <span>←</span>
                            Back to Contest Overview
                        </button>

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
                    </div>
                </div>

                <div class="comp-hero-decoration">
                    <span>{ }</span>
                </div>
            </section>

            <!-- CONTEST INFO & PROGRESS -->
            <section class="comp-info-section">
                <div class="comp-info-grid">
                    <div class="comp-info-card">
                        <div class="comp-info-icon">
                            <i class="fa fa-play"></i>
                        </div>
                        <div>
                            <span class="info-label">STARTS</span>
                            <strong>${this.escape_html(startDate)}</strong>
                        </div>
                    </div>

                    <div class="comp-info-card">
                        <div class="comp-info-icon">
                            <i class="fa fa-stop"></i>
                        </div>
                        <div>
                            <span class="info-label">ENDS</span>
                            <strong>${this.escape_html(endDate)}</strong>
                        </div>
                    </div>

                    <div class="comp-info-card highlight-card score-card">
                        <div class="comp-info-icon score-icon">
                            <i class="fa fa-star"></i>
                        </div>
                        <div>
                            <span class="info-label">MY SCORE / TOTAL</span>
                            <strong class="score-text">${myScore} <small>/ ${totalPoints} PTS</small></strong>
                        </div>
                    </div>

                    <div class="comp-info-card highlight-card progress-card">
                        <div class="comp-info-icon progress-icon">
                            <i class="fa fa-check"></i>
                        </div>
                        <div class="progress-card-body">
                            <span class="info-label">PROGRESS</span>
                            <strong>${solvedCount} / ${problems.length} <small>Solved</small></strong>
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill" style="width:${progressPct}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PROBLEMS -->
            <section class="comp-problems-section">
                <div class="comp-section-heading">
                    <div class="comp-section-title-wrapper">
                        <div class="comp-section-icon">
                            <i class="fa fa-code"></i>
                        </div>
                        <div>
                            <h2>Contest Problems</h2>
                            <p>Choose a problem to start solving in the code editor.</p>
                        </div>
                    </div>

                    <span class="comp-problem-count">
                        ${problems.length}
                        <small>${problems.length === 1 ? "Problem" : "Problems"}</small>
                    </span>
                </div>

                <div class="comp-problem-list">
                    ${
						problems.length
							? problems
									.sort(
										(a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
									)
									.map((problem, index) =>
										this.render_problem(
											problem,
											index,
											solvedSet.has(problem.problem),
											attemptedSet.has(problem.problem)
										)
									)
									.join("")
							: `
                                <div class="comp-empty-state">
                                    <div class="placeholder-icon">
                                        <i class="fa fa-inbox"></i>
                                    </div>
                                    <h3>No problems yet</h3>
                                    <p>Problems for this contest haven't been added yet.</p>
                                </div>
                            `
					}
                </div>
            </section>
        `);

		this.bind_events();
	}

	render_problem(problem, index, isSolved, isAttempted) {
		const number = String(index + 1).padStart(2, "0");
		const points = Number(problem.points) || 0;

		let statusPill = `<span class="problem-status-pill unsolved"><i class="fa fa-circle-o"></i> Unsolved</span>`;

		if (isSolved) {
			statusPill = `<span class="problem-status-pill solved"><i class="fa fa-check"></i> Solved</span>`;
		} else if (isAttempted) {
			statusPill = `<span class="problem-status-pill attempted"><i class="fa fa-clock-o"></i> Attempted</span>`;
		}

		return `
            <div class="comp-problem-card ${
				isSolved ? "is-solved" : ""
			}" data-problem="${this.escape_html(problem.problem)}">
                <div class="comp-problem-number">
                    ${isSolved ? `<i class="fa fa-check"></i>` : number}
                </div>

                <div class="comp-problem-main">
                    <div class="comp-problem-title-row">
                        <div class="comp-problem-title">
                            ${this.escape_html(problem.title || problem.problem)}
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

	bind_events() {
		$(".comp-back-btn")
			.off("click")
			.on("click", () => {
				frappe.set_route("contest-page", this.contest_name);
			});

		$(".comp-problem-card")
			.off("click")
			.on("click", (event) => {
				const problem = $(event.currentTarget).data("problem");

				if (!problem) return;

				frappe.set_route("contest-solve", this.contest_name, problem);
			});
	}

	render_error(message) {
		$(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-comp-page">
                <button class="comp-back-btn standalone">
                    <span>←</span> Back to Contests
                </button>

                <div class="comp-state">
                    <div class="state-icon error">
                        <i class="fa fa-exclamation-triangle"></i>
                    </div>
                    <h2>Unable to load contest</h2>
                    <p>${this.escape_html(message)}</p>
                </div>
            </div>
        `);

		$(".comp-back-btn").on("click", () => {
			frappe.set_route("contest-page");
		});
	}

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
    --card-shadow: 0 1px 2px rgba(15, 15, 15, 0.04), 0 8px 24px rgba(15, 15, 15, 0.05);
    --card-shadow-hover: 0 2px 4px rgba(15, 15, 15, 0.06), 0 16px 36px rgba(15, 15, 15, 0.09);
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
}

.comp-back-btn {
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

.comp-back-btn:hover {
    background: var(--control-bg);
    transform: translateX(-2px);
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

.comp-problem-card.is-solved {
    border-color: var(--green-soft);
    background: linear-gradient(155deg, var(--card-bg), var(--green-soft));
}

.comp-problem-card.is-solved:hover {
    border-color: var(--green);
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
    font-size: 24px;
    color: var(--text-muted);
    margin-bottom: 12px;
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
    font-size: 28px;
    color: var(--text-muted);
    margin-bottom: 12px;
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
    margin: 0;
    color: var(--text-muted);
    font-size: 13px;
}

/* LOADING */

.contest-comp-loading {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: var(--text-muted);
    font-size: 13px;
}

.loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 900px) {
    .comp-info-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .comp-info-grid {
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
}

</style>
        `);
	}
}