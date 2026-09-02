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
            single_column: true
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

    load_contest() {
        frappe.call({
            method: "dsa.api.get_contest",
            args: {
                name: this.contest_name
            }
        }).then((r) => {
            if (!r.message) {
                this.render_error("Contest not found.");
                return;
            }

            this.contest = r.message;
            this.render_contest(this.contest);
        }).catch((error) => {
            console.error("Failed to load contest:", error);
            this.render_error("Unable to load contest.");
        });
    }

    render_contest(contest) {
        const status = contest.status || "Upcoming";
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

        $(this.wrapper).find(".contest-comp-page").html(`

            <!-- HERO -->

            <section class="contest-comp-hero">

                <div class="contest-comp-hero-glow"></div>

                <div class="contest-comp-hero-content">

                    <div class="contest-comp-top">

                        <button class="contest-back-btn">
                            <span>←</span>
                            Back to Contest
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
                                ${this.escape_html(
                                    contest.title || contest.name
                                )}
                            </h1>

                            <p class="contest-comp-description">
                                ${this.escape_html(
                                    contest.description ||
                                    "Test your problem-solving skills."
                                )}
                            </p>
                        </div>

                    </div>

                </div>

            </section>


            <!-- CONTEST INFO -->

            <section class="contest-info-section">

                <div class="contest-info-grid">

                    <div class="contest-info-card">
                        <div class="info-icon">◷</div>

                        <div>
                            <span class="info-label">
                                STARTS
                            </span>

                            <strong>
                                ${this.escape_html(startDate)}
                            </strong>
                        </div>
                    </div>


                    <div class="contest-info-card">
                        <div class="info-icon">◷</div>

                        <div>
                            <span class="info-label">
                                ENDS
                            </span>

                            <strong>
                                ${this.escape_html(endDate)}
                            </strong>
                        </div>
                    </div>


                    <div class="contest-info-card">
                        <div class="info-icon">#</div>

                        <div>
                            <span class="info-label">
                                PROBLEMS
                            </span>

                            <strong>
                                ${problems.length}
                            </strong>
                        </div>
                    </div>


                    <div class="contest-info-card">
                        <div class="info-icon">★</div>

                        <div>
                            <span class="info-label">
                                TOTAL POINTS
                            </span>

                            <strong>
                                ${totalPoints}
                            </strong>
                        </div>
                    </div>

                </div>

            </section>


            <!-- PROBLEMS -->

            <section class="contest-problems-section">

                <div class="section-header">

                    <div>
                        <span class="section-label">
                            CHALLENGES
                        </span>

                        <h2>
                            Contest Problems
                        </h2>

                        <p>
                            Choose a problem to start solving.
                        </p>
                    </div>

                    <div class="problem-count">
                        ${problems.length}
                        <span>
                            ${problems.length === 1 ? "Problem" : "Problems"}
                        </span>
                    </div>

                </div>


                <div class="contest-problem-list">

                    ${
                        problems.length
                            ? problems
                                  .sort(
                                      (a, b) =>
                                          (Number(a.order) || 0) -
                                          (Number(b.order) || 0)
                                  )
                                  .map(
                                      (problem, index) =>
                                          this.render_problem(
                                              problem,
                                              index
                                          )
                                  )
                                  .join("")
                            : `
                                <div class="empty-problems">
                                    <div class="empty-icon">∅</div>
                                    <h3>No problems yet</h3>
                                    <p>
                                        Problems for this contest haven't
                                        been added yet.
                                    </p>
                                </div>
                            `
                    }

                </div>

            </section>

        `);

        this.bind_events();
    }

    render_problem(problem, index) {
        const number = String(index + 1).padStart(2, "0");

        const points = Number(problem.points) || 0;

        /*
         * The Contest Problem row currently gives us the linked
         * DSAProblem name. We will fetch the full problem details
         * later if needed.
         */

        return `
            <div
                class="contest-problem-card"
                data-problem="${this.escape_html(problem.problem)}"
            >

                <div class="problem-number">
                    ${number}
                </div>


                <div class="problem-main">

                    <div class="problem-title">
                        ${this.escape_html(
                            problem.title ||
                            problem.problem ||
                            "Problem"
                        )}
                    </div>

                    <div class="problem-meta">
                        <span class="problem-tag">
                            Problem ${number}
                        </span>
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

        $(".contest-back-btn").off("click").on("click", () => {
            frappe.set_route(
                "contest-page",
                this.contest_name
            );
        });


        $(".contest-problem-card").off("click").on("click", (event) => {

            const problem = $(event.currentTarget).data("problem");

            if (!problem) {
                return;
            }

            frappe.set_route(
                "contest-solve",
                this.contest_name,
                problem
            );
        });

    }

    render_error(message) {
        $(this.wrapper).find(".layout-main-section").html(`
            <div class="contest-comp-page">

                <div class="contest-error">

                    <div class="error-icon">
                        !
                    </div>

                    <h2>
                        Something went wrong
                    </h2>

                    <p>
                        ${this.escape_html(message)}
                    </p>

                    <button class="contest-back-btn">
                        ← Back to Contests
                    </button>

                </div>

            </div>
        `);

        $(".contest-back-btn").off("click").on("click", () => {
            frappe.set_route("contest-page");
        });
    }

    status_class(status) {
        return String(status)
            .toLowerCase()
            .replace(/\s+/g, "-");
    }

    escape_html(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    add_styles() {
        if ($("#contest-comp-styles").length) {
            return;
        }

        $("head").append(`
            <style id="contest-comp-styles">

                .contest-comp-page {
                    min-height: calc(100vh - 80px);
                    background: #111111;
                    color: #eeeeee;
                    padding-bottom: 60px;
                }


                /* HERO */

                .contest-comp-hero {
                    position: relative;
                    overflow: hidden;
                    background:
                        linear-gradient(
                            135deg,
                            #181818 0%,
                            #111111 65%
                        );
                    border-bottom: 1px solid #2b2b2b;
                }

                .contest-comp-hero-glow {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    right: -180px;
                    top: -250px;
                    border-radius: 50%;
                    background: rgba(255, 193, 7, 0.06);
                    filter: blur(5px);
                }

                .contest-comp-hero-content {
                    position: relative;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 32px 28px 42px;
                }

                .contest-comp-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 40px;
                }

                .contest-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 15px;
                    border: 1px solid #343434;
                    border-radius: 7px;
                    background: #191919;
                    color: #bdbdbd;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.15s ease;
                }

                .contest-back-btn:hover {
                    color: #ffffff;
                    border-color: #555555;
                    background: #222222;
                }

                .contest-back-btn span {
                    font-size: 18px;
                }


                .contest-status {
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .contest-status.active {
                    background: rgba(40, 167, 69, 0.14);
                    color: #5ee47b;
                    border: 1px solid rgba(40, 167, 69, 0.3);
                }

                .contest-status.upcoming {
                    background: rgba(255, 193, 7, 0.12);
                    color: #ffc107;
                    border: 1px solid rgba(255, 193, 7, 0.25);
                }

                .contest-status.completed {
                    background: rgba(130, 130, 130, 0.12);
                    color: #aaaaaa;
                    border: 1px solid #333333;
                }


                .contest-label,
                .section-label {
                    color: #ffc107;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    margin-bottom: 10px;
                }

                .contest-comp-title-row h1 {
                    margin: 0;
                    color: #ffffff;
                    font-size: clamp(30px, 5vw, 48px);
                    line-height: 1.1;
                    font-weight: 800;
                    letter-spacing: -1px;
                }

                .contest-comp-description {
                    max-width: 700px;
                    margin: 18px 0 0;
                    color: #a8a8a8;
                    font-size: 15px;
                    line-height: 1.7;
                }


                /* INFO */

                .contest-info-section {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 28px;
                }

                .contest-info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 14px;
                }

                .contest-info-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 18px;
                    border: 1px solid #2b2b2b;
                    border-radius: 10px;
                    background: #181818;
                }

                .info-icon {
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border-radius: 8px;
                    background: rgba(255, 193, 7, 0.1);
                    color: #ffc107;
                    font-weight: 700;
                }

                .info-label {
                    display: block;
                    margin-bottom: 4px;
                    color: #777777;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 1px;
                }

                .contest-info-card strong {
                    display: block;
                    color: #eeeeee;
                    font-size: 13px;
                    font-weight: 600;
                }


                /* PROBLEMS */

                .contest-problems-section {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 5px 28px 0;
                }

                .section-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .section-header h2 {
                    margin: 0;
                    color: #ffffff;
                    font-size: 25px;
                    font-weight: 750;
                }

                .section-header p {
                    margin: 7px 0 0;
                    color: #777777;
                    font-size: 13px;
                }

                .problem-count {
                    color: #ffc107;
                    font-size: 22px;
                    font-weight: 700;
                    text-align: right;
                }

                .problem-count span {
                    display: block;
                    color: #666666;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }


                .contest-problem-list {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                }

                .contest-problem-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 18px 20px;
                    border: 1px solid #2b2b2b;
                    border-radius: 10px;
                    background: #181818;
                    cursor: pointer;
                    transition:
                        transform 0.15s ease,
                        border-color 0.15s ease,
                        background 0.15s ease;
                }

                .contest-problem-card:hover {
                    transform: translateY(-1px);
                    border-color: #4a4a4a;
                    background: #1d1d1d;
                }

                .problem-number {
                    width: 42px;
                    color: #666666;
                    font-size: 12px;
                    font-weight: 700;
                }

                .problem-main {
                    flex: 1;
                    min-width: 0;
                }

                .problem-title {
                    overflow: hidden;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 650;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .problem-meta {
                    margin-top: 5px;
                }

                .problem-tag {
                    color: #777777;
                    font-size: 10px;
                }

                .problem-points {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    min-width: 55px;
                }

                .problem-points span {
                    color: #ffc107;
                    font-size: 15px;
                    font-weight: 700;
                }

                .problem-points small {
                    color: #666666;
                    font-size: 8px;
                    font-weight: 700;
                    letter-spacing: 0.7px;
                }

                .problem-arrow {
                    color: #666666;
                    font-size: 20px;
                    transition: transform 0.15s ease;
                }

                .contest-problem-card:hover .problem-arrow {
                    color: #ffc107;
                    transform: translateX(3px);
                }


                /* EMPTY */

                .empty-problems {
                    padding: 70px 20px;
                    border: 1px dashed #333333;
                    border-radius: 10px;
                    text-align: center;
                    background: #151515;
                }

                .empty-icon {
                    margin-bottom: 12px;
                    color: #555555;
                    font-size: 30px;
                }

                .empty-problems h3 {
                    margin: 0;
                    color: #cccccc;
                    font-size: 16px;
                }

                .empty-problems p {
                    margin: 8px 0 0;
                    color: #666666;
                    font-size: 13px;
                }


                /* LOADING */

                .contest-comp-loading {
                    display: flex;
                    min-height: 500px;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 15px;
                    color: #777777;
                }

                .loading-spinner {
                    width: 28px;
                    height: 28px;
                    border: 2px solid #333333;
                    border-top-color: #ffc107;
                    border-radius: 50%;
                    animation: contest-spin 0.8s linear infinite;
                }

                @keyframes contest-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }


                /* ERROR */

                .contest-error {
                    min-height: 500px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    text-align: center;
                }

                .error-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    margin-bottom: 15px;
                    border-radius: 50%;
                    background: rgba(220, 53, 69, 0.1);
                    color: #ff6b7a;
                    font-weight: 800;
                }

                .contest-error h2 {
                    margin: 0;
                    color: #eeeeee;
                    font-size: 20px;
                }

                .contest-error p {
                    margin: 8px 0 20px;
                    color: #777777;
                    font-size: 13px;
                }


                /* RESPONSIVE */

                @media (max-width: 900px) {

                    .contest-info-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                }


                @media (max-width: 600px) {

                    .contest-comp-hero-content,
                    .contest-info-section,
                    .contest-problems-section {
                        padding-left: 16px;
                        padding-right: 16px;
                    }

                    .contest-comp-top {
                        margin-bottom: 30px;
                    }

                    .contest-comp-title-row h1 {
                        font-size: 32px;
                    }

                    .contest-comp-description {
                        font-size: 13px;
                    }

                    .contest-info-grid {
                        grid-template-columns: 1fr;
                    }

                    .section-header {
                        align-items: flex-start;
                    }

                    .problem-count {
                        display: none;
                    }

                    .contest-problem-card {
                        gap: 12px;
                        padding: 15px;
                    }

                    .problem-number {
                        width: 28px;
                    }

                    .problem-points {
                        min-width: 40px;
                    }

                    .problem-arrow {
                        display: none;
                    }

                }

            </style>
        `);
    }
}