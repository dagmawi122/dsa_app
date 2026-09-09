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
			this.render_error("No contest selected", "There are currently no contests selected. Please choose a contest from the list.");
		}
	}

	handle_route_change(contest_name) {
		this.contest_name = contest_name;

		if (!contest_name) {
			this.render_error("No contest selected", "There are currently no contests selected. Please choose a contest from the list.");
			return;
		}

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
		if (!this.contest_name) {
			this.render_error("No contest selected", "There are currently no contests selected. Please choose a contest from the list.");
			return;
		}

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
				this.render_error("Contest not found", "The contest you're looking for could not be found.");
				return;
			}

			this.contest = contestRes.message;
			this.progress = progressRes?.message || null;
			this.render_contest(this.contest, this.progress);
		} catch (error) {
			console.error("Failed to load contest:", error);
			const rawMsg = error?.messages?.join("\n") || error?.message || "";
			if (rawMsg.toLowerCase().includes("not found")) {
				this.render_error("Contest not found", "The contest you're looking for could not be found.");
			} else {
				this.render_error("Unable to load contest", "Something went wrong while loading the contest. Please try again later.");
			}
		}
	}

	render_contest(contest, progress) {
		const status = contest.status || "Upcoming";
		const problems = contest.problems || [];

		const startDate = contest.start_date
			? frappe.datetime.str_to_user(contest.start_date)
			: "—";

		const endDate = contest.end_date ? frappe.datetime.str_to_user(contest.end_date) : "—";

		const totalPoints = problems.reduce(
			(total, problem) => total + (Number(problem.points) || 0),
			0
		);

		const myScore = progress ? progress.total_score || 0 : 0;
		const solvedCount = progress ? progress.solved_count || 0 : 0;

		const solvedSet = new Set(progress?.solved || []);
		const attemptedSet = new Set(progress?.attempted || []);

		$(this.wrapper).find(".contest-comp-page").html(`
            <!-- HERO -->
            <section class="contest-comp-hero">
                <div class="contest-comp-hero-glow"></div>

                <div class="contest-comp-hero-content">
                    <div class="contest-comp-top">
                        <button class="contest-back-btn">
                            <span>←</span>
                            Back to Contest Overview
                        </button>

                        <div class="contest-status ${this.status_class(status)}">
                            ${this.escape_html(status)}
                        </div>
                    </div>

                    <div class="contest-comp-title-row">
                        <div>
                            <div class="contest-label">
                                CONTEST
                            </div>

                            <h1>
                                ${this.escape_html(contest.title || contest.name)}
                            </h1>

                            <p class="contest-comp-description">
                                ${this.escape_html(
									contest.description || "Test your problem-solving skills."
								)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CONTEST INFO & PROGRESS -->
            <section class="contest-info-section">
                <div class="contest-info-grid">
                    <div class="contest-info-card">
                        <div class="info-icon">◷</div>
                        <div>
                            <span class="info-label">STARTS</span>
                            <strong>${this.escape_html(startDate)}</strong>
                        </div>
                    </div>

                    <div class="contest-info-card">
                        <div class="info-icon">◷</div>
                        <div>
                            <span class="info-label">ENDS</span>
                            <strong>${this.escape_html(endDate)}</strong>
                        </div>
                    </div>

                    <div class="contest-info-card highlight-card">
                        <div class="info-icon score-icon">★</div>
                        <div>
                            <span class="info-label">MY SCORE / TOTAL</span>
                            <strong class="score-text">${myScore} <small>/ ${totalPoints} PTS</small></strong>
                        </div>
                    </div>

                    <div class="contest-info-card highlight-card">
                        <div class="info-icon progress-icon">✓</div>
                        <div>
                            <span class="info-label">PROGRESS</span>
                            <strong>${solvedCount} / ${
			problems.length
		} <small>Solved</small></strong>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PROBLEMS -->
            <section class="contest-problems-section">
                <div class="section-header">
                    <div>
                        <span class="section-label">CHALLENGES</span>
                        <h2>Contest Problems</h2>
                        <p>Choose a problem to start solving in the code editor.</p>
                    </div>

                    <div class="problem-count">
                        ${problems.length}
                        <span>${problems.length === 1 ? "Problem" : "Problems"}</span>
                    </div>
                </div>

                <div class="contest-problem-list">
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
                                <div class="empty-problems">
                                    <div class="empty-icon">∅</div>
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

		let statusPill = `<span class="problem-status-pill unsolved">○ Unsolved</span>`;
		if (isSolved) {
			statusPill = `<span class="problem-status-pill solved"><i class="fa fa-check"></i> Solved</span>`;
		} else if (isAttempted) {
			statusPill = `<span class="problem-status-pill attempted"><i class="fa fa-clock-o"></i> Attempted</span>`;
		}

		return `
            <div class="contest-problem-card ${
				isSolved ? "is-solved" : ""
			}" data-problem="${this.escape_html(problem.problem)}">
                <div class="problem-number">
                    ${isSolved ? `<span class="solved-check">✓</span>` : number}
                </div>

                <div class="problem-main">
                    <div class="problem-title-row">
                        <div class="problem-title">
                            ${this.escape_html(problem.problem)}
                        </div>
                        ${statusPill}
                    </div>

                    <div class="problem-meta">
                        <span class="problem-tag">Challenge ${number}</span>
                    </div>
                </div>

                <div class="problem-points">
                    <span>${points}</span>
                    <small>PTS</small>
                </div>

                <div class="problem-arrow">
                    →
                </div>
            </div>
        `;
	}

	bind_events() {
		$(".contest-back-btn")
			.off("click")
			.on("click", () => {
				frappe.set_route("contest-page", this.contest_name);
			});

		$(".contest-problem-card")
			.off("click")
			.on("click", (event) => {
				const problem = $(event.currentTarget).data("problem");
				if (!problem) return;

				frappe.set_route("contest-solve", this.contest_name, problem);
			});
	}

	render_error(title = "Unable to load contest", message = "") {
		if (!message && title) {
			message = title;
			title = "Unable to load contest";
		}
		$(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-comp-page">
                <div class="contest-error">
                    <div class="error-icon">!</div>
                    <h2>${this.escape_html(title)}</h2>
                    <p>${this.escape_html(message)}</p>
                    <button class="contest-back-btn">Back to Contests</button>
                </div>
            </div>
        `);

		$(".contest-back-btn").on("click", () => {
			frappe.set_route("contest-page");
		});
	}

	status_class(status) {
		const s = (status || "").toLowerCase();
		if (s === "active") return "running";
		if (s === "upcoming") return "upcoming";
		return "ended";
	}

	escape_html(str) {
		return frappe.utils.escape_html(str || "");
	}

	add_styles() {
		if ($("#contest-comp-styles").length) return;

		$("head").append(`
            <style id="contest-comp-styles">
                .contest-comp-page { padding: 30px; max-width: 1200px; margin: 0 auto; color: #eee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .contest-comp-hero { position: relative; padding: 35px; border-radius: 14px; background: linear-gradient(135deg, #1e1e1e 0%, #141414 100%); border: 1px solid #2e2e2e; margin-bottom: 30px; overflow: hidden; }
                .contest-comp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .contest-back-btn { background: #252525; border: 1px solid #383838; color: #bbb; padding: 7px 15px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; }
                .contest-back-btn:hover { background: #303030; color: #fff; }
                .contest-status { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
                .contest-status.running { background: rgba(40, 199, 111, 0.15); color: #28c76f; }
                .contest-status.upcoming { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
                .contest-status.ended { background: rgba(120, 120, 120, 0.15); color: #888; }
                .contest-label { font-size: 10px; font-weight: 800; color: #ffc107; letter-spacing: 1px; margin-bottom: 8px; }
                .contest-comp-hero h1 { font-size: 32px; font-weight: 800; margin: 0 0 10px; color: #fff; }
                .contest-comp-description { color: #888; font-size: 14px; margin: 0; line-height: 1.6; }
                .contest-info-section { margin-bottom: 35px; }
                .contest-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
                .contest-info-card { background: #181818; border: 1px solid #2b2b2b; padding: 18px; border-radius: 10px; display: flex; align-items: center; gap: 14px; }
                .contest-info-card.highlight-card { background: #1a1e1b; border-color: #2c4233; }
                .info-icon { width: 38px; height: 38px; border-radius: 8px; background: #222; display: flex; align-items: center; justify-content: center; color: #ffc107; font-size: 14px; }
                .score-icon { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
                .progress-icon { background: rgba(40, 199, 111, 0.15); color: #28c76f; }
                .info-label { display: block; font-size: 10px; color: #777; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 3px; }
                .contest-info-card strong { font-size: 14px; color: #eee; }
                .score-text { color: #ffc107 !important; font-size: 16px !important; }
                .score-text small { font-size: 11px; color: #888; }
                .contest-problems-section { margin-bottom: 40px; }
                .section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
                .section-label { font-size: 10px; font-weight: 800; color: #ffc107; letter-spacing: 1px; display: block; margin-bottom: 4px; }
                .section-header h2 { margin: 0; font-size: 22px; color: #fff; font-weight: 800; }
                .section-header p { margin: 4px 0 0; color: #777; font-size: 13px; }
                .problem-count { font-size: 20px; font-weight: 800; color: #ffc107; text-align: right; }
                .problem-count span { display: block; font-size: 10px; color: #666; font-weight: 600; text-transform: uppercase; }
                .contest-problem-list { display: flex; flex-direction: column; gap: 10px; }
                .contest-problem-card { display: flex; align-items: center; gap: 18px; padding: 18px 22px; border: 1px solid #282828; border-radius: 10px; background: #171717; cursor: pointer; transition: all 0.2s ease; }
                .contest-problem-card:hover { transform: translateX(3px); border-color: #ffc107; background: #1d1d1d; }
                .contest-problem-card.is-solved { border-color: #245037; background: #131915; }
                .contest-problem-card.is-solved:hover { border-color: #28c76f; background: #16221c; }
                .problem-number { font-family: monospace; font-size: 13px; font-weight: 800; color: #777; width: 32px; display: flex; align-items: center; justify-content: center; }
                .solved-check { color: #28c76f; font-size: 16px; font-weight: 800; }
                .problem-main { flex: 1; }
                .problem-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
                .problem-title { font-size: 14px; font-weight: 700; color: #fff; }
                .problem-status-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
                .problem-status-pill.solved { background: rgba(40, 199, 111, 0.2); color: #28c76f; }
                .problem-status-pill.attempted { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
                .problem-status-pill.unsolved { background: #262626; color: #777; }
                .problem-meta { font-size: 11px; color: #666; }
                .problem-points { text-align: right; min-width: 50px; }
                .problem-points span { font-size: 15px; font-weight: 800; color: #ffc107; display: block; }
                .problem-points small { font-size: 8px; font-weight: 700; color: #666; letter-spacing: 0.5px; }
                .problem-arrow { color: #555; font-size: 16px; transition: transform 0.2s ease; }
                .contest-problem-card:hover .problem-arrow { color: #ffc107; transform: translateX(3px); }
                .empty-problems { padding: 60px; text-align: center; border: 1px dashed #303030; border-radius: 10px; background: #141414; }
                .empty-icon { font-size: 26px; color: #555; margin-bottom: 10px; }
                .contest-comp-loading, .contest-error { min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #777; }
                .loading-spinner { width: 26px; height: 26px; border: 2px solid #333; border-top-color: #ffc107; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 900px) { .contest-info-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 600px) { .contest-info-grid { grid-template-columns: 1fr; } .contest-problem-card { padding: 14px; } }
            </style>
        `);
	}
}
