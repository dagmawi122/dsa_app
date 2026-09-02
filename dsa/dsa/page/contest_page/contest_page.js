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
            single_column: true
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


    /* =========================================================
       ROUTE
       ========================================================= */

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

                        <span>
                            Loading contests...
                        </span>

                    </div>

                </div>

            </div>

        `);
    }


    async load_contests() {

        try {

            const response = await frappe.call({

                method: "dsa.api.get_contests",

                args: {
                    limit_start: 0,
                    limit_page_length: 100
                }

            });

            const contests = response.message || [];

            this.render_contests(contests);

        }

        catch (error) {

            console.error(
                "Failed to load contests:",
                error
            );

            $(".contest-content").html(`

                <div class="contest-state">

                    <div class="state-icon error">
                        !
                    </div>

                    <h3>
                        Unable to load contests
                    </h3>

                    <p>
                        Something went wrong while loading contests.
                    </p>

                    <button class="contest-retry">
                        Try Again
                    </button>

                </div>

            `);

            $(".contest-retry").on(
                "click",
                () => this.load_contests()
            );
        }
    }


    render_contests(contests) {

        if (!contests.length) {

            $(".contest-content").html(`

                <div class="contest-state">

                    <div class="state-icon">
                        ☰
                    </div>

                    <h3>
                        No contests available
                    </h3>

                    <p>
                        Check back later for upcoming competitions.
                    </p>

                </div>

            `);

            return;
        }


        const upcoming = contests.filter(
            contest => contest.status === "Upcoming"
        );

        const running = contests.filter(
            contest => contest.status === "Active"
        );

        const ended = contests.filter(
            contest => contest.status === "Completed"
        );


        $(".contest-content").html(`

            ${this.render_section(
                "Running",
                "Contests happening right now",
                running,
                "running"
            )}

            ${this.render_section(
                "Upcoming",
                "Get ready for the next challenge",
                upcoming,
                "upcoming"
            )}

            ${this.render_section(
                "Ended",
                "Previous competitions",
                ended,
                "ended"
            )}

        `);

        this.bind_listing_events();
    }


    render_section(
        title,
        subtitle,
        contests,
        type
    ) {

        if (!contests.length) {
            return "";
        }


        return `

            <section class="contest-section ${type}-section">

                <div class="section-heading">

                    <div class="section-title-wrapper">

                        <div class="section-icon ${type}">
                            ${this.get_section_icon(type)}
                        </div>

                        <div>

                            <h2>
                                ${title}
                            </h2>

                            <p>
                                ${subtitle}
                            </p>

                        </div>

                    </div>

                    <span class="section-count">
                        ${contests.length}
                    </span>

                </div>


                <div class="contest-grid">

                    ${contests.map(
                        contest =>
                            this.render_card(
                                contest,
                                type
                            )
                    ).join("")}

                </div>

            </section>

        `;
    }


    render_card(contest, type) {

        const start =
            this.format_date(
                contest.start_date
            );

        const duration =
            this.calculate_duration(
                contest.start_date,
                contest.end_date
            );

        const description =
            this.strip_html(
                contest.description
            ) ||
            "Put your problem-solving skills to the test.";


        return `

            <article
                class="contest-card ${type}"
                data-contest="${this.escape_html(contest.name)}"
            >

                <div class="card-top">

                    <span class="contest-status ${type}">

                        <span class="status-dot"></span>

                        ${this.get_status_label(type)}

                    </span>


                    <span class="contest-code">

                        ${this.escape_html(
                            contest.name
                        )}

                    </span>

                </div>


                <h3 class="contest-title">

                    ${this.escape_html(
                        contest.title
                    )}

                </h3>


                <p class="contest-description">

                    ${this.escape_html(
                        description
                    )}

                </p>


                <div class="contest-meta">

                    <div class="meta-item">

                        <div class="meta-icon">

                            <i class="fa fa-calendar"></i>

                        </div>

                        <div>

                            <span class="meta-label">
                                STARTS
                            </span>

                            <span class="meta-value">
                                ${start}
                            </span>

                        </div>

                    </div>


                    <div class="meta-item">

                        <div class="meta-icon">

                            <i class="fa fa-clock-o"></i>

                        </div>

                        <div>

                            <span class="meta-label">
                                DURATION
                            </span>

                            <span class="meta-value">
                                ${duration}
                            </span>

                        </div>

                    </div>


                    <div class="meta-item">

                        <div class="meta-icon">

                            <i class="fa fa-code"></i>

                        </div>

                        <div>

                            <span class="meta-label">
                                PROBLEMS
                            </span>

                            <span class="meta-value">
                                —
                            </span>

                        </div>

                    </div>

                </div>


                <div class="card-divider"></div>


                <div class="card-footer">

                    <span class="contest-end">

                        ${
                            type === "ended"

                                ? `Ended ${this.format_date(
                                    contest.end_date
                                )}`

                                : `Ends ${this.format_date(
                                    contest.end_date
                                )}`
                        }

                    </span>


                    <button
                        class="view-contest"
                        data-contest="${this.escape_html(
                            contest.name
                        )}"
                    >

                        View Contest

                        <span class="arrow">
                            →
                        </span>

                    </button>

                </div>

            </article>

        `;
    }


    bind_listing_events() {

        $(".view-contest").on(
            "click",
            (event) => {

                event.stopPropagation();

                const contest_name =
                    $(event.currentTarget)
                        .data("contest");

                this.open_contest(
                    contest_name
                );
            }
        );


        $(".contest-card").on(
            "click",
            (event) => {

                if (
                    $(event.target)
                        .closest(".view-contest")
                        .length
                ) {
                    return;
                }

                const contest_name =
                    $(event.currentTarget)
                        .data("contest");

                this.open_contest(
                    contest_name
                );
            }
        );
    }


    open_contest(contest_name) {

        frappe.set_route(
            "contest-page",
            contest_name
        );
    }


    /* =========================================================
       DETAILS
       ========================================================= */

    render_details() {

        $(this.wrapper)
            .find(".layout-main-section")
            .html(`

                <div class="contest-page">

                    <div class="contest-details-page">

                        <button class="back-to-contests">

                            <span>
                                ←
                            </span>

                            Back to Contests

                        </button>


                        <div class="details-loading">

                            <div class="loading-spinner"></div>

                            <span>
                                Loading contest...
                            </span>

                        </div>

                    </div>

                </div>

            `);
    }


    async load_contest() {

        try {

            const response =
                await frappe.call({

                    method:
                        "dsa.api.get_contest",

                    args: {
                        name:
                            this.contest_name
                    }

                });


            const contest =
                response.message;


            if (!contest) {

                this.render_not_found();

                return;
            }


            this.render_contest_details(
                contest
            );

        }

        catch (error) {

            console.error(
                "Failed to load contest:",
                error
            );

            this.render_error();
        }
    }


    render_contest_details(contest) {

        const type =
            this.get_status_type(
                contest.status
            );


        const description =
            this.strip_html(
                contest.description
            ) ||
            "No description available for this contest.";


        const duration =
            this.calculate_duration(
                contest.start_date,
                contest.end_date
            );


        const problems =
            contest.problems || [];


        $(".contest-details-page").html(`

            <!-- BACK -->

            <button class="back-to-contests">

                <span>
                    ←
                </span>

                Back to Contests

            </button>


            <!-- HERO -->

            <div class="details-hero ${type}">

                <div class="details-hero-content">

                    <div class="details-top-row">

                        <span class="contest-status ${type}">

                            <span class="status-dot"></span>

                            ${this.get_status_label(type)}

                        </span>


                        <span class="details-contest-code">

                            ${this.escape_html(
                                contest.name
                            )}

                        </span>

                    </div>


                    <h1>

                        ${this.escape_html(
                            contest.title
                        )}

                    </h1>


                    <p>

                        ${this.escape_html(
                            description
                        )}

                    </p>

                    <button
                        class="contest-join-btn"
                        data-contest="${this.escape_html(contest.name)}"
                    >
                        Join Contest
                    </button>

                </div>


                <div class="details-hero-decoration">

                    <span>
                        { }
                    </span>

                </div>

            </div>


            <!-- INFORMATION -->

            <section class="details-section">

                <div class="details-section-title">

                    <span class="section-line"></span>

                    <div>

                        <h2>
                            Contest Information
                        </h2>

                        <p>
                            Everything you need to know about this contest.
                        </p>

                    </div>

                </div>


                <div class="details-info-grid">


                    <div class="info-card">

                        <div class="info-card-icon">

                            <i class="fa fa-play"></i>

                        </div>

                        <div>

                            <span class="info-label">
                                STARTS
                            </span>

                            <strong>
                                ${this.format_date(
                                    contest.start_date
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="info-card">

                        <div class="info-card-icon">

                            <i class="fa fa-flag-checkered"></i>

                        </div>

                        <div>

                            <span class="info-label">
                                ENDS
                            </span>

                            <strong>
                                ${this.format_date(
                                    contest.end_date
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="info-card">

                        <div class="info-card-icon">

                            <i class="fa fa-clock-o"></i>

                        </div>

                        <div>

                            <span class="info-label">
                                DURATION
                            </span>

                            <strong>
                                ${duration}
                            </strong>

                        </div>

                    </div>


                    <div class="info-card">

                        <div class="info-card-icon">

                            <i class="fa fa-code"></i>

                        </div>

                        <div>

                            <span class="info-label">
                                PROBLEMS
                            </span>

                            <strong>
                                ${problems.length}
                            </strong>

                        </div>

                    </div>


                </div>

            </section>


            <!-- ABOUT -->

            <section class="details-section">

                <div class="details-section-title">

                    <span class="section-line"></span>

                    <div>

                        <h2>
                            About This Contest
                        </h2>

                        <p>
                            Contest description and information.
                        </p>

                    </div>

                </div>


                <div class="about-card">

                    <div class="about-icon">

                        <i class="fa fa-info"></i>

                    </div>


                    <div class="about-content">

                        <div class="contest-description-full">

                            ${
                                contest.description ||
                                "No description available."
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

                        <h2>
                            Problems
                        </h2>

                        <p>

                            ${
                                problems.length
                            }

                            problem${
                                problems.length === 1
                                    ? ""
                                    : "s"
                            }

                            in this contest.

                        </p>

                    </div>

                </div>


                <div class="contest-problems">

                    ${
                        problems.length

                            ? problems.map(
                                (problem, index) =>
                                    this.render_problem_card(
                                        problem,
                                        index
                                    )
                            ).join("")

                            : `

                                <div class="problems-placeholder">

                                    <div class="placeholder-icon">

                                        <i class="fa fa-code"></i>

                                    </div>


                                    <h3>
                                        No problems
                                    </h3>


                                    <p>
                                        No problems have been added
                                        to this contest yet.
                                    </p>

                                </div>

                            `
                    }

                </div>

            </section>

        `);


        this.bind_details_events();

        this.bind_problem_events();
    }


    render_problem_card(problem, index) {

        const problem_name =
            problem.problem || "Unknown Problem";


        return `

            <div
                class="problem-card"
                data-problem="${this.escape_html(
                    problem_name
                )}"
            >

                <div class="problem-number">

                    ${String(
                        problem.order || index + 1
                    ).padStart(2, "0")}

                </div>


                <div class="problem-main">

                    <div class="problem-title">

                        ${this.escape_html(
                            problem_name
                        )}

                    </div>


                    <div class="problem-meta">

                        Problem ${
                            problem.order ||
                            index + 1
                        }

                    </div>

                </div>


                <div class="problem-points">

                    <span class="points-label">
                        POINTS
                    </span>

                    <strong>

                        ${problem.points || 0}

                    </strong>

                </div>


                <div class="problem-arrow">

                    →

                </div>

            </div>

        `;
    }


    bind_problem_events() {

        $(".problem-card").on(
            "click",
            (event) => {

                const problem =
                    $(event.currentTarget)
                        .data("problem");

                console.log(
                    "Selected contest problem:",
                    problem
                );

                /*
                 * Later we can route this to the
                 * actual DSA problem/code editor.
                 */

            }
        );
    }


    bind_details_events() {

        $(".back-to-contests").on(
            "click",
            () => {

                frappe.set_route(
                    "contest-page"
                );

            }
        );


        $(".contest-join-btn").on(
            "click",
            () => {

                frappe.set_route(
                    "contest-comp",
                    this.contest_name
                );

            }
        );
    }


    render_not_found() {

        $(".contest-details-page").html(`

            <button class="back-to-contests">

                <span>
                    ←
                </span>

                Back to Contests

            </button>


            <div class="contest-state">

                <div class="state-icon">
                    ?
                </div>


                <h3>
                    Contest not found
                </h3>


                <p>
                    The contest you're looking for doesn't exist.
                </p>

            </div>

        `);


        this.bind_details_events();
    }


    render_error() {

        $(".contest-details-page").html(`

            <button class="back-to-contests">

                <span>
                    ←
                </span>

                Back to Contests

            </button>


            <div class="contest-state">

                <div class="state-icon error">
                    !
                </div>


                <h3>
                    Unable to load contest
                </h3>


                <p>
                    Something went wrong while loading this contest.
                </p>


                <button class="contest-retry">
                    Try Again
                </button>

            </div>

        `);


        $(".back-to-contests").on(
            "click",
            () => {

                frappe.set_route(
                    "contest-page"
                );

            }
        );


        $(".contest-retry").on(
            "click",
            () => {

                this.render_details();

                this.load_contest();

            }
        );
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    get_status_type(status) {

        if (status === "Upcoming") {
            return "upcoming";
        }

        if (status === "Active") {
            return "running";
        }

        return "ended";
    }


    get_status_label(type) {

        const labels = {

            running: "LIVE NOW",

            upcoming: "UPCOMING",

            ended: "ENDED"

        };

        return labels[type];
    }


    get_section_icon(type) {

        const icons = {

            running: "●",

            upcoming: "◷",

            ended: "✓"

        };

        return icons[type];
    }


    format_date(date) {

        if (!date) {
            return "—";
        }

        return frappe.datetime.str_to_user(
            date
        );
    }


    calculate_duration(
        start_date,
        end_date
    ) {

        if (
            !start_date ||
            !end_date
        ) {
            return "—";
        }


        const start =
            new Date(start_date);

        const end =
            new Date(end_date);


        const diff_minutes =
            Math.round(
                (end - start) /
                (1000 * 60)
            );


        if (diff_minutes <= 0) {
            return "—";
        }


        if (diff_minutes < 60) {

            return `${diff_minutes} min`;

        }


        const hours =
            Math.floor(
                diff_minutes / 60
            );

        const minutes =
            diff_minutes % 60;


        if (minutes === 0) {

            return `${hours} hr`;

        }


        return `${hours} hr ${minutes} min`;
    }


    strip_html(value) {

        if (!value) {
            return "";
        }


        const div =
            document.createElement(
                "div"
            );


        div.innerHTML = value;


        return (
            div.textContent ||
            div.innerText ||
            ""
        );
    }


    escape_html(value) {

        if (!value) {
            return "";
        }

        return frappe.utils.escape_html(
            String(value)
        );
    }


    /* =========================================================
       STYLES
       ========================================================= */

    add_styles() {

        if (
            $("#contest-page-styles")
                .length
        ) {
            return;
        }


        $("head").append(`

<style id="contest-page-styles">

/* =========================================================
   GLOBAL
   ========================================================= */

.contest-page {

    min-height:
        calc(100vh - 60px);

    padding:
        35px 45px 60px;

    background:
        #0d0d0d;

    color:
        #f5f5f5;
}


.layout-main-section {

    background:
        #0d0d0d !important;

}


/* =========================================================
   HERO
   ========================================================= */

.contest-hero {

    position:
        relative;

    overflow:
        hidden;

    max-width:
        1400px;

    margin:
        0 auto 50px;

    padding:
        45px 50px;

    border:
        1px solid #252525;

    border-radius:
        16px;

    background:

        radial-gradient(
            circle at 85% 50%,
            rgba(255, 193, 7, 0.10),
            transparent 35%
        ),

        linear-gradient(
            135deg,
            #151515,
            #101010
        );

    box-shadow:
        0 20px 60px
        rgba(0, 0, 0, 0.35);
}


.hero-content {

    position:
        relative;

    z-index:
        2;
}


.hero-badge {

    display:
        inline-flex;

    align-items:
        center;

    gap:
        8px;

    margin-bottom:
        18px;

    font-size:
        11px;

    font-weight:
        700;

    letter-spacing:
        1.2px;

    color:
        #ffc107;
}


.hero-badge-dot {

    width:
        7px;

    height:
        7px;

    border-radius:
        50%;

    background:
        #ffc107;

    box-shadow:
        0 0 10px
        rgba(255, 193, 7, 0.8);
}


.contest-hero h1 {

    margin:
        0 0 10px;

    font-size:
        42px;

    font-weight:
        800;

    letter-spacing:
        -1px;

    color:
        #ffffff;
}


.contest-hero p {

    max-width:
        620px;

    margin:
        0;

    font-size:
        15px;

    line-height:
        1.7;

    color:
        #929292;
}


.hero-decoration {

    position:
        absolute;

    right:
        60px;

    top:
        50%;

    transform:
        translateY(-50%);

    opacity:
        0.08;
}


.code-symbol {

    font-size:
        150px;

    font-weight:
        900;

    color:
        #ffc107;

    font-family:
        monospace;
}


/* =========================================================
   SECTIONS
   ========================================================= */

.contest-content {

    max-width:
        1400px;

    margin:
        0 auto;
}


.contest-section {

    margin-bottom:
        48px;
}


.section-heading {

    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;

    margin-bottom:
        20px;
}


.section-title-wrapper {

    display:
        flex;

    align-items:
        center;

    gap:
        13px;
}


.section-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    width:
        38px;

    height:
        38px;

    border-radius:
        10px;

    font-size:
        15px;

    font-weight:
        700;
}


.section-icon.running,
.section-icon.upcoming {

    color:
        #ffc107;

    background:
        rgba(255, 193, 7, 0.10);
}


.section-icon.ended {

    color:
        #777777;

    background:
        rgba(255, 255, 255, 0.05);
}


.section-heading h2 {

    margin:
        0 0 3px;

    font-size:
        21px;

    font-weight:
        700;

    color:
        #ffffff;
}


.section-heading p {

    margin:
        0;

    font-size:
        12px;

    color:
        #777777;
}


.section-count {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    min-width:
        28px;

    height:
        28px;

    padding:
        0 9px;

    border:
        1px solid #292929;

    border-radius:
        8px;

    font-size:
        12px;

    color:
        #888888;

    background:
        #151515;
}


/* =========================================================
   CONTEST GRID
   ========================================================= */

.contest-grid {

    display:
        grid;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(350px, 1fr)
        );

    gap:
        18px;
}


/* =========================================================
   CONTEST CARD
   ========================================================= */

.contest-card {

    position:
        relative;

    display:
        flex;

    flex-direction:
        column;

    min-height:
        320px;

    padding:
        24px;

    border:
        1px solid #292929;

    border-radius:
        14px;

    background:
        #151515;

    cursor:
        pointer;

    transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}


.contest-card:hover {

    transform:
        translateY(-4px);

    border-color:
        #3a3a3a;

    box-shadow:
        0 15px 40px
        rgba(0, 0, 0, 0.35);
}


.contest-card.running {

    border-color:
        rgba(255, 193, 7, 0.28);

    background:

        linear-gradient(
            145deg,
            rgba(255, 193, 7, 0.055),
            #151515 45%
        );
}


.contest-card.running:hover {

    border-color:
        rgba(255, 193, 7, 0.55);
}


.contest-card.ended {

    opacity:
        0.72;
}


.contest-card.ended:hover {

    opacity:
        1;
}


/* =========================================================
   CARD TOP
   ========================================================= */

.card-top {

    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;

    margin-bottom:
        18px;
}


.contest-status {

    display:
        inline-flex;

    align-items:
        center;

    gap:
        7px;

    padding:
        6px 9px;

    border-radius:
        6px;

    font-size:
        10px;

    font-weight:
        800;

    letter-spacing:
        0.6px;
}


.contest-status.running {

    color:
        #ffc107;

    background:
        rgba(255, 193, 7, 0.10);
}


.contest-status.upcoming {

    color:
        #ffc107;

    background:
        rgba(255, 193, 7, 0.08);
}


.contest-status.ended {

    color:
        #777777;

    background:
        rgba(255, 255, 255, 0.05);
}


.status-dot {

    width:
        6px;

    height:
        6px;

    border-radius:
        50%;

    background:
        currentColor;
}


.running .status-dot {

    animation:
        contest-pulse 1.5s infinite;
}


@keyframes contest-pulse {

    0% {

        opacity:
            1;

        box-shadow:
            0 0 0 0
            rgba(255, 193, 7, 0.4);

    }

    70% {

        opacity:
            0.7;

        box-shadow:
            0 0 0 6px
            rgba(255, 193, 7, 0);

    }

    100% {

        opacity:
            1;

        box-shadow:
            0 0 0 0
            rgba(255, 193, 7, 0);

    }

}


.contest-code {

    font-family:
        monospace;

    font-size:
        10px;

    color:
        #555555;
}


/* =========================================================
   CARD CONTENT
   ========================================================= */

.contest-title {

    margin:
        0 0 10px;

    font-size:
        20px;

    font-weight:
        700;

    line-height:
        1.3;

    color:
        #ffffff;
}


.contest-description {

    margin:
        0 0 24px;

    display:
        -webkit-box;

    -webkit-line-clamp:
        2;

    -webkit-box-orient:
        vertical;

    overflow:
        hidden;

    min-height:
        42px;

    font-size:
        13px;

    line-height:
        1.6;

    color:
        #858585;
}


/* =========================================================
   META
   ========================================================= */

.contest-meta {

    display:
        grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap:
        10px;

    margin-top:
        auto;
}


.meta-item {

    display:
        flex;

    align-items:
        center;

    gap:
        8px;
}


.meta-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    width:
        30px;

    height:
        30px;

    border-radius:
        7px;

    color:
        #777777;

    background:
        #1e1e1e;

    font-size:
        11px;
}


.meta-item > div:last-child {

    display:
        flex;

    flex-direction:
        column;

    min-width:
        0;
}


.meta-label {

    margin-bottom:
        3px;

    font-size:
        8px;

    font-weight:
        700;

    letter-spacing:
        0.8px;

    color:
        #555555;
}


.meta-value {

    overflow:
        hidden;

    font-size:
        11px;

    color:
        #b5b5b5;

    white-space:
        nowrap;

    text-overflow:
        ellipsis;
}


/* =========================================================
   CARD FOOTER
   ========================================================= */

.card-divider {

    height:
        1px;

    margin:
        22px 0 16px;

    background:
        #242424;
}


.card-footer {

    display:
        flex;

    align-items:
        center;

    justify-content:
        space-between;
}


.contest-end {

    font-size:
        10px;

    color:
        #555555;
}


.view-contest {

    display:
        inline-flex;

    align-items:
        center;

    gap:
        7px;

    padding:
        8px 13px;

    border:
        1px solid #343434;

    border-radius:
        7px;

    background:
        #1d1d1d;

    color:
        #d0d0d0;

    font-size:
        11px;

    font-weight:
        600;

    cursor:
        pointer;

    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
}


.view-contest:hover {

    border-color:
        #ffc107;

    background:
        #ffc107;

    color:
        #111111;
}


.arrow {

    font-size:
        15px;
}


/* =========================================================
   DETAILS
   ========================================================= */

.contest-details-page {

    max-width:
        1100px;

    margin:
        0 auto;
}


.back-to-contests {

    display:
        inline-flex;

    align-items:
        center;

    gap:
        8px;

    margin-bottom:
        25px;

    padding:
        0;

    border:
        0;

    background:
        transparent;

    color:
        #777777;

    font-size:
        13px;

    cursor:
        pointer;

    transition:
        color 0.15s ease;
}


.back-to-contests:hover {

    color:
        #ffc107;
}


.back-to-contests span {

    font-size:
        18px;
}


/* =========================================================
   DETAILS HERO
   ========================================================= */

.details-hero {

    position:
        relative;

    overflow:
        hidden;

    margin-bottom:
        40px;

    padding:
        40px;

    border:
        1px solid #292929;

    border-radius:
        16px;

    background:
        #151515;
}


.details-hero.running {

    border-color:
        rgba(255, 193, 7, 0.30);

    background:

        radial-gradient(
            circle at 90% 50%,
            rgba(255, 193, 7, 0.10),
            transparent 35%
        ),

        #151515;
}


.details-hero.upcoming {

    background:

        radial-gradient(
            circle at 90% 50%,
            rgba(255, 193, 7, 0.07),
            transparent 35%
        ),

        #151515;
}


.details-hero.ended {

    opacity:
        0.85;
}


.details-hero-content {

    position:
        relative;

    z-index:
        2;
}


.details-top-row {

    display:
        flex;

    align-items:
        center;

    gap:
        15px;

    margin-bottom:
        22px;
}


.details-contest-code {

    font-family:
        monospace;

    font-size:
        11px;

    color:
        #555555;
}


.details-hero h1 {

    max-width:
        750px;

    margin:
        0 0 15px;

    font-size:
        38px;

    font-weight:
        800;

    line-height:
        1.2;

    letter-spacing:
        -0.8px;

    color:
        #ffffff;
}


.details-hero p {

    max-width:
        720px;

    margin:
        0;

    font-size:
        14px;

    line-height:
        1.8;

    color:
        #888888;
}


.details-hero-decoration {

    position:
        absolute;

    right:
        40px;

    top:
        50%;

    transform:
        translateY(-50%);

    color:
        #ffc107;

    opacity:
        0.06;

    font-family:
        monospace;

    font-size:
        120px;

    font-weight:
        800;
}


/* =========================================================
   DETAILS SECTIONS
   ========================================================= */

.details-section {

    margin-bottom:
        45px;
}


.details-section-title {

    display:
        flex;

    align-items:
        flex-start;

    gap:
        12px;

    margin-bottom:
        20px;
}


.section-line {

    width:
        3px;

    height:
        42px;

    border-radius:
        3px;

    background:
        #ffc107;
}


.details-section-title h2 {

    margin:
        0 0 4px;

    font-size:
        20px;

    font-weight:
        700;

    color:
        #ffffff;
}


.details-section-title p {

    margin:
        0;

    font-size:
        12px;

    color:
        #666666;
}


/* =========================================================
   INFO CARDS
   ========================================================= */

.details-info-grid {

    display:
        grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap:
        12px;
}


.info-card {

    display:
        flex;

    align-items:
        center;

    gap:
        12px;

    min-height:
        90px;

    padding:
        17px;

    border:
        1px solid #282828;

    border-radius:
        10px;

    background:
        #151515;
}


.info-card-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    flex-shrink:
        0;

    width:
        36px;

    height:
        36px;

    border-radius:
        9px;

    color:
        #ffc107;

    background:
        rgba(255, 193, 7, 0.08);

    font-size:
        12px;
}


.info-card > div:last-child {

    display:
        flex;

    flex-direction:
        column;

    min-width:
        0;
}


.info-label {

    margin-bottom:
        5px;

    font-size:
        8px;

    font-weight:
        700;

    letter-spacing:
        0.8px;

    color:
        #555555;
}


.info-card strong {

    overflow:
        hidden;

    font-size:
        11px;

    font-weight:
        600;

    color:
        #c0c0c0;

    white-space:
        nowrap;

    text-overflow:
        ellipsis;
}


/* =========================================================
   ABOUT
   ========================================================= */

.about-card {

    display:
        flex;

    gap:
        17px;

    padding:
        25px;

    border:
        1px solid #282828;

    border-radius:
        12px;

    background:
        #151515;
}


.about-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    flex-shrink:
        0;

    width:
        35px;

    height:
        35px;

    border-radius:
        9px;

    background:
        #1e1e1e;

    color:
        #ffc107;

    font-size:
        12px;
}


.about-content {

    min-width:
        0;
}


.contest-description-full {

    color:
        #a0a0a0;

    font-size:
        14px;

    line-height:
        1.8;
}


.contest-description-full p {

    margin-top:
        0;
}


/* =========================================================
   PROBLEMS
   ========================================================= */

.contest-problems {

    display:
        flex;

    flex-direction:
        column;

    gap:
        10px;
}


.problem-card {

    display:
        flex;

    align-items:
        center;

    gap:
        18px;

    padding:
        18px 20px;

    border:
        1px solid #282828;

    border-radius:
        11px;

    background:
        #151515;

    cursor:
        pointer;

    transition:
        border-color 0.2s ease,
        background 0.2s ease,
        transform 0.2s ease;
}


.problem-card:hover {

    border-color:
        rgba(255, 193, 7, 0.45);

    background:

        linear-gradient(
            90deg,
            rgba(255, 193, 7, 0.05),
            #151515
        );

    transform:
        translateX(3px);
}


.problem-number {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    flex-shrink:
        0;

    width:
        42px;

    height:
        42px;

    border-radius:
        9px;

    background:
        #1e1e1e;

    color:
        #ffc107;

    font-family:
        monospace;

    font-size:
        12px;

    font-weight:
        700;
}


.problem-main {

    flex:
        1;

    min-width:
        0;
}


.problem-title {

    margin-bottom:
        5px;

    color:
        #eeeeee;

    font-size:
        14px;

    font-weight:
        600;
}


.problem-meta {

    color:
        #666666;

    font-size:
        10px;
}


.problem-points {

    display:
        flex;

    flex-direction:
        column;

    align-items:
        flex-end;

    min-width:
        60px;
}


.points-label {

    margin-bottom:
        3px;

    color:
        #555555;

    font-size:
        8px;

    font-weight:
        700;

    letter-spacing:
        0.8px;
}


.problem-points strong {

    color:
        #ffc107;

    font-size:
        13px;
}


.problem-arrow {

    color:
        #555555;

    font-size:
        18px;

    transition:
        color 0.2s ease;
}


.problem-card:hover .problem-arrow {

    color:
        #ffc107;
}


/* =========================================================
   EMPTY / LOADING
   ========================================================= */

.problems-placeholder {

    padding:
        60px 25px;

    border:
        1px dashed #292929;

    border-radius:
        12px;

    background:
        #121212;

    text-align:
        center;
}


.placeholder-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    width:
        50px;

    height:
        50px;

    margin:
        0 auto 15px;

    border-radius:
        12px;

    background:
        #1e1e1e;

    color:
        #ffc107;

    font-size:
        17px;
}


.problems-placeholder h3 {

    margin:
        0 0 7px;

    font-size:
        16px;

    color:
        #dddddd;
}


.problems-placeholder p {

    max-width:
        500px;

    margin:
        0 auto;

    font-size:
        12px;

    line-height:
        1.6;

    color:
        #666666;
}


.details-loading,
.contest-loading {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    gap:
        10px;

    color:
        #666666;

    font-size:
        13px;
}


.details-loading {

    min-height:
        400px;
}


.contest-loading {

    padding:
        80px;
}


.loading-spinner {

    width:
        16px;

    height:
        16px;

    border:
        2px solid #292929;

    border-top-color:
        #ffc107;

    border-radius:
        50%;

    animation:
        spin 0.7s linear infinite;
}


@keyframes spin {

    to {
        transform:
            rotate(360deg);
    }

}


/* =========================================================
   EMPTY / ERROR STATE
   ========================================================= */

.contest-state {

    padding:
        100px 20px;

    text-align:
        center;

    border:
        1px dashed #292929;

    border-radius:
        14px;

    background:
        #121212;
}


.state-icon {

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    width:
        50px;

    height:
        50px;

    margin:
        0 auto 15px;

    border-radius:
        12px;

    background:
        #1e1e1e;

    color:
        #777777;

    font-size:
        20px;

    font-weight:
        700;
}


.state-icon.error {

    color:
        #ffc107;
}


.contest-state h3 {

    margin:
        0 0 7px;

    color:
        #dddddd;

    font-size:
        17px;
}


.contest-state p {

    margin:
        0 0 20px;

    color:
        #666666;

    font-size:
        13px;
}


.contest-retry {

    padding:
        9px 16px;

    border:
        0;

    border-radius:
        7px;

    background:
        #ffc107;

    color:
        #111111;

    font-size:
        12px;

    font-weight:
        700;

    cursor:
        pointer;
}

.contest-join-btn {

    margin-top:
        25px;

    padding:
        12px 26px;

    border:
        none;

    border-radius:
        8px;

    background:
        #ffc107;

    color:
        #111111;

    font-size:
        13px;

    font-weight:
        700;

    letter-spacing:
        0.2px;

    cursor:
        pointer;

    transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
}


.contest-join-btn:hover {

    background:
        #ffca28;

    transform:
        translateY(-1px);

    box-shadow:
        0 6px 20px
        rgba(255, 193, 7, 0.18);
}


/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 1000px) {

    .details-info-grid {

        grid-template-columns:
            repeat(2, 1fr);

    }

}


@media (max-width: 900px) {

    .contest-page {

        padding:
            25px 25px 50px;

    }


    .contest-hero {

        padding:
            35px;

    }


    .hero-decoration,
    .details-hero-decoration {

        display:
            none;

    }


    .contest-grid {

        grid-template-columns:
            1fr;

    }


    .details-hero {

        padding:
            30px;

    }


    .details-hero h1 {

        font-size:
            32px;

    }

}


@media (max-width: 600px) {

    .contest-page {

        padding:
            20px 15px 40px;

    }


    .contest-hero {

        padding:
            28px 22px;

        border-radius:
            12px;

    }


    .contest-hero h1 {

        font-size:
            32px;

    }


    .contest-hero p {

        font-size:
            13px;

    }


    .contest-card {

        padding:
            20px;

    }


    .contest-meta {

        grid-template-columns:
            1fr;

    }


    .details-info-grid {

        grid-template-columns:
            1fr;

    }


    .details-hero {

        padding:
            25px 20px;

    }


    .details-hero h1 {

        font-size:
            27px;

    }


    .details-top-row {

        flex-wrap:
            wrap;

    }


    .about-card {

        padding:
            20px;

    }


    .problem-card {

        gap:
            12px;

        padding:
            15px;

    }


    .problem-number {

        width:
            36px;

        height:
            36px;

    }


    .problem-points {

        min-width:
            45px;

    }

    

}

</style>

        `);
    }
}