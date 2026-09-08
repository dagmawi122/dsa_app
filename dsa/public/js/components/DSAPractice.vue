<template>
    <div v-if="loading" class="dsa-state">{{ __("Loading problems…") }}</div>

    <div v-else-if="!problem" class="dsa-state">{{ __("No problems have been published yet.") }}</div>

    <div v-else ref="practiceShell" class="dsa-practice-shell" :class="{ 'is-resizing': resizing }">
        <div class="dsa-panels" :style="panelStyle">
            <div class="dsa-pane dsa-problem-pane">
                <nav class="dsa-tabbar" :aria-label="__('Problem navigation')">
                    <button
                        type="button"
                        class="dsa-tab"
                        :class="{ 'is-active': activeProblemTab === 'description' }"
                        @click="selectProblemTab('description')"
                    >
                        <span class="dsa-tab-icon blue">▣</span>{{ __("Description") }}
                    </button>

                    <button
                        type="button"
                        class="dsa-tab"
                        :class="{ 'is-active': activeProblemTab === 'submissions' }"
                        @click="selectProblemTab('submissions')"
                    >
                        <span class="dsa-tab-icon blue">↶</span>{{ __("Submissions") }}
                    </button>
                </nav>

                <div v-if="activeProblemTab === 'description'" class="dsa-statement">
                    <h1>{{ problem.title }}</h1>

                    <div class="dsa-meta">
                        <span class="dsa-difficulty">{{ problem.difficulty }}</span>
                        <span class="dsa-chip">◇ {{ __("Topics") }}</span>
                        <span class="dsa-chip amber">▢ {{ __("Companies") }}</span>
                        <span class="dsa-chip">♧ {{ __("Hint") }}</span>
                    </div>

                    <section>
                        <div class="dsa-rich-text" v-html="safeDescription"></div>
                    </section>

                    <section>
                        <h3>{{ __("Examples") }}</h3>
                        <div class="dsa-rich-text" v-html="safeExamples"></div>
                    </section>

                    <section>
                        <h3>{{ __("Constraints") }}</h3>
                        <div class="dsa-rich-text" v-html="safeConstraints"></div>
                    </section>
                </div>

                <div v-else class="dsa-tab-content">
                    <div class="dsa-content-heading">
                        <h2>{{ __("My submissions") }}</h2>

                        <button
                            type="button"
                            :disabled="submissionsLoading"
                            @click="loadSubmissions"
                        >
                            {{ __("Refresh") }}
                        </button>
                    </div>

                    <div
    v-if="props.contestMode && contestProgress"
    class="contest-progress"
>
    <div class="contest-progress-header">
        <strong>{{ __("Contest Progress") }}</strong>

        <span>
            {{ __("Score") }}:
            <b>{{ contestProgress.total_score || 0 }}</b>
        </span>
    </div>

    <div class="contest-progress-stats">
        <div class="progress-item solved">
            <strong>
                {{ contestProgress.solved_count || 0 }}
            </strong>
            <span>{{ __("Solved") }}</span>
        </div>

        <div class="progress-item attempted">
            <strong>
                {{ contestProgress.attempted_count || 0 }}
            </strong>
            <span>{{ __("Attempted") }}</span>
        </div>

        <div class="progress-item unsolved">
            <strong>
                {{ contestProgress.unsolved_count || 0 }}
            </strong>
            <span>{{ __("Unsolved") }}</span>
        </div>
    </div>
</div>

                    <div v-if="submissionsLoading" class="dsa-tab-empty">
                        {{ __("Loading…") }}
                    </div>

                    <div v-else-if="!submissions.length" class="dsa-tab-empty">
                        {{ __("No submissions yet.") }}
                    </div>

                    <article
    v-for="submission in submissions"
    v-else
    :key="submission.name"
    class="dsa-submission-card"
     >
    <div class="dsa-submission-main">
        <strong
            class="submission-status"
            :class="statusClass(submission.status)"
        >
            <span>{{ statusIcon(submission.status) }}</span>
            {{ displayStatus(submission.status) }}
        </strong>

        <span v-if="props.contestMode" class="submission-score">
            {{ Number(submission.score || 0) }}
            {{ __("pts") }}
        </span>

        <span>
            {{ submission.passed_count }}/{{ submission.total_count }}
            {{ __("passed") }}
        </span>

        <span v-if="submission.runtime != null">
            {{ (Number(submission.runtime) * 1000).toFixed(0) }} {{ __("ms") }}
        </span>

        <time>{{ formatSubmissionTime(submission) }}</time>
    </div>
              </article>
                </div>
            </div>

            <div
                class="dsa-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-valuemin="28"
                aria-valuemax="72"
                :aria-valuenow="Math.round(leftPanelWidth)"
                tabindex="0"
                @pointerdown="startResize"
                @keydown="resizeWithKeyboard"
            >
                <span></span>
            </div>

            <div class="dsa-pane dsa-solution">
                <div class="dsa-code-panel">
                    <div class="dsa-panel-title">
                        <strong>
                            <span class="dsa-code-icon">&lt;/&gt;</span>
                            {{ __("Code") }}
                        </strong>

                        <div class="dsa-actions">
                            <button
                                type="button"
                                class="dsa-button dsa-run"
                                :disabled="busy"
                                @click="runCode"
                            >
                                <span class="lucide-play"></span>
                                {{ __("Run") }}
                            </button>

                            <button
                                type="button"
                                class="dsa-button dsa-submit"
                                :disabled="busy"
                                @click="submitCode"
                            >
                                <span class="lucide-check"></span>
                                {{ __("Submit") }}
                            </button>

                            <div v-if="contestMode" class="dsa-timer">
                                {{ formatTime(elapsedTime) }}
                            </div>
                        </div>
                    </div>

                    <div class="dsa-editor-toolbar">
                        <label class="dsa-language-select">
                            <span class="sr-only">
                                {{ __("Programming language") }}
                            </span>

                            <select
                                v-model.number="selectedLanguageId"
                                :disabled="busy"
                                @change="changeLanguage"
                            >
                                <option
                                    v-for="language in languages"
                                    :key="language.id"
                                    :value="language.id"
                                >
                                    {{ language.label }}
                                </option>
                            </select>

                            <span class="dsa-chevron">⌄</span>
                        </label>

                        <span>
                            <span class="dsa-lock">●</span>
                            {{ __("Auto") }}
                        </span>
                    </div>

                    <div class="dsa-editor-area">
                        <MonacoEditor
                            ref="monacoEditor"
                            v-model="code"
                            :language="selectedLanguage.monaco"
                        />
                    </div>

                    <div class="dsa-editor-status">
                        <span>{{ __("Saved") }}</span>
                        <span>Ln 1, Col 1</span>
                    </div>
                </div>

                <div class="dsa-terminal">
                    <div class="dsa-terminal-header">
                        <div class="dsa-result-tabs">
                            <button
                                type="button"
                                :class="{ 'is-active': activeResultTab === 'testcase' }"
                                @click="activeResultTab = 'testcase'"
                            >
                                <span class="green">☑</span>
                                {{ __("Testcase") }}
                            </button>

                            <button
                                type="button"
                                :class="{ 'is-active': activeResultTab === 'result' }"
                                @click="activeResultTab = 'result'"
                            >
                                <span class="green">&gt;_</span>
                                {{ __("Test Result") }}
                            </button>
                        </div>

                        <button
                            v-if="activeResultTab === 'result' && (terminalOutput || testResults.length)"
                            type="button"
                            @click="clearResults"
                        >
                            {{ __("Clear") }}
                        </button>
                    </div>

                    <div class="dsa-terminal-output">
                        <div
                            v-if="activeResultTab === 'testcase'"
                            class="dsa-testcase-input"
                        >
                            <div class="dsa-case-tabs">
                                <button
                                    v-for="(testCase, index) in testCases"
                                    :key="testCase.key"
                                    type="button"
                                    :class="{ 'is-active': activeTestCaseIndex === index }"
                                    @click="activeTestCaseIndex = index"
                                >
                                    {{ __("Case") }} {{ index + 1 }}
                                </button>

                                <button
                                    type="button"
                                    class="dsa-add-case"
                                    :title="__('Add test case')"
                                    @click="addTestCase"
                                >
                                    +
                                </button>
                            </div>

                            <label for="dsa-stdin">
                                {{ __("Input") }} =
                            </label>

                            <textarea
                                id="dsa-stdin"
                                v-model="testCases[activeTestCaseIndex].input"
                                :placeholder="__('Enter input passed to your program…')"
                            ></textarea>
                        </div>

                        <template v-else>
                            <div v-if="busy" class="dsa-muted">
                                {{ __("Running…") }}
                            </div>

                            <div v-else-if="testResults.length" class="dsa-results">
                                <div class="dsa-result-summary">
                                    <strong :class="overallStatus.toLowerCase()">
                                        {{ overallStatus }}
                                    </strong>

                                    <span v-if="resultRuntime">
                                        {{ __("Runtime") }}: {{ resultRuntime }}
                                    </span>

                                    <span v-if="resultComplexity">
                                        Time Complexity: {{ resultComplexity }}
                                        <b
                                            v-if="complexityResult"
                                            :class="['complexity-result', complexityResult.toLowerCase().replace(' ', '-')]"
                                        >
                                            {{ complexityResult === "Optimal" ? "✓" : "⚠" }}
                                            {{ complexityResult }}
                                        </b>
                                    </span>

                                    <span v-if="resultSpaceComplexity">
                                        Space Complexity: {{ resultSpaceComplexity }}
                                        <b
                                            v-if="spaceComplexityResult"
                                            :class="['complexity-result', spaceComplexityResult.toLowerCase().replace(' ', '-')]"
                                        >
                                            {{ spaceComplexityResult === "Optimal" ? "✓" : "⚠" }}
                                            {{ spaceComplexityResult }}
                                        </b>
                                    </span>
                                </div>

                                <div class="dsa-case-tabs result-cases">
                                    <button
                                        v-for="(result, index) in testResults"
                                        :key="result.index"
                                        type="button"
                                        :class="{ 'is-active': activeResultCaseIndex === index }"
                                        @click="activeResultCaseIndex = index"
                                    >
                                        <span
                                            :class="
                                                result.status === 'Accepted'
                                                    ? 'case-pass'
                                                    : 'case-fail'
                                            "
                                        >
                                            ■
                                        </span>

                                        {{ __("Case") }} {{ result.index }}
                                    </button>
                                </div>

                                <div
                                    v-if="activeTestResult"
                                    class="dsa-result-details"
                                >
                                    <label>{{ __("Input") }}</label>
                                    <pre>{{ activeTestResult.input || __("No input") }}</pre>

                                    <label
                                        v-if="activeTestResult.expected_output !== undefined"
                                    >
                                        {{ __("Expected Output") }}
                                    </label>

                                    <pre
                                        v-if="activeTestResult.expected_output !== undefined"
                                    >
                                        {{
                                            activeTestResult.expected_output ||
                                            __("No output")
                                        }}
                                    </pre>

                                    <label>
                                        {{
                                            activeTestResult.error
                                                ? __("Error")
                                                : __("Output")
                                        }}
                                    </label>

                                    <pre
                                        :class="{ 'is-error': activeTestResult.error }"
                                    >
                                        {{
                                            activeTestResult.error ||
                                            activeTestResult.actual_output ||
                                            __("No output")
                                        }}
                                    </pre>
                                </div>
                            </div>

                            <pre v-else-if="terminalOutput">{{ terminalOutput }}</pre>

                            <div v-else class="dsa-empty-result">
                                {{ __("You must run your code first") }}
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import MonacoEditor from "./MonacoEditor.vue";

const elapsedTime = ref(0);
let timerInterval = null;

const __ = (text) => text;

const props = defineProps({
    page: {
        type: Object,
        required: true,
    },
    contestMode: {
        type: Boolean,
        default: false,
    },
    contestName: {
        type: String,
        default: "",
    },
    problemName: {
        type: String,
        default: "",
    },
});

const languages = [
    {
        id: 54,
        label: "C++",
        monaco: "cpp",
        starter: "// Write your C++ solution here\n",
    },
    {
        id: 71,
        label: "Python 3",
        monaco: "python",
        starter: "# Write your Python solution here\n",
    },
    {
        id: 63,
        label: "JavaScript",
        monaco: "javascript",
        starter: "// Write your JavaScript solution here\n",
    },
    {
        id: 62,
        label: "Java",
        monaco: "java",
        starter: "// Write your Java solution here\n",
    },
];

const loading = ref(true);
const problem = ref(null);
const code = ref("");
const busy = ref(false);
const terminalOutput = ref("");
const selectedLanguageId = ref(54);
const testCases = ref([{ key: 1, input: "" }]);
const activeTestCaseIndex = ref(0);
const testResults = ref([]);
const activeResultCaseIndex = ref(0);
const overallStatus = ref("");
const resultRuntime = ref("");
const resultComplexity = ref("");
const resultSpaceComplexity = ref("");
const complexityResult = ref("");
const spaceComplexityResult = ref("");
const activeProblemTab = ref("description");
const activeResultTab = ref("testcase");
const submissions = ref([]);
const submissionsLoading = ref(false);
const monacoEditor = ref(null);
const practiceShell = ref(null);
const leftPanelWidth = ref(50);
const resizing = ref(false);
const contestProgress = ref(null);
const contestProgressLoading = ref(false);

let generation = 0;
let nextTestCaseKey = 2;
let previousLanguageId = 54;
let codeDrafts = {};

const safeDescription = computed(() =>
    sanitize(problem.value?.description)
);

const safeExamples = computed(() =>
    sanitize(problem.value?.examples)
);

const safeConstraints = computed(() =>
    sanitize(problem.value?.constraints)
);

const panelStyle = computed(() => ({
    "--left-panel-width": `${leftPanelWidth.value}%`,
}));

const selectedLanguage = computed(() =>
    languages.find(
        (language) => language.id === selectedLanguageId.value
    ) || languages[0]
);

const activeTestResult = computed(() =>
    testResults.value[activeResultCaseIndex.value] || null
);

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
}
 function displayStatus(status) {
    const normalized = String(status || "").toLowerCase();

    const statusMap = {
        accepted: __("Accepted"),
        "wrong answer": __("Wrong Answer"),
        "time limit exceeded": __("Time Limit Exceeded"),
        "compilation error": __("Compilation Error"),
        "runtime error": __("Runtime Error"),
        failed: __("Wrong Answer"),
        running: __("Running"),
        queued: __("Queued"),
    };

    return statusMap[normalized] || status || __("Unknown");
}

function statusClass(status) {
    return String(status || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function statusIcon(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "accepted") {
        return "✓";
    }

    if (normalized === "running" || normalized === "queued") {
        return "◷";
    }

    if (normalized === "time limit exceeded") {
        return "⏰";
    }

    if (normalized === "compilation error" || normalized === "runtime error") {
        return "!";
    }

    return "✕";
}

function formatSubmissionTime(submission) {
    return submission.submission_time ||
        submission.creation ||
        "—";
}

function startTimer(startedAt) {
    if (!props.contestMode || !startedAt) return;

    clearInterval(timerInterval);

    const startTime = new Date(startedAt).getTime();

    const updateElapsedTime = () => {
        elapsedTime.value = Math.max(
            0,
            Math.floor((Date.now() - startTime) / 1000)
        );
    };

    updateElapsedTime();

    timerInterval = setInterval(updateElapsedTime, 1000);
}

async function startContestProblem() {
    if (!props.contestMode || !props.contestName || !problem.value) {
        return;
    }

    const attempt = await call(
        "dsa.api.start_contest_problem",
        {
            contest: props.contestName,
            problem: problem.value.name,
        },
        "POST"
    );

    startTimer(attempt.started_at);
}

function changeLanguage() {
    codeDrafts[previousLanguageId] = code.value;

    code.value =
        codeDrafts[selectedLanguageId.value] ??
        problem.value?.starter_codes?.[selectedLanguageId.value] ??
        selectedLanguage.value.starter;

    previousLanguageId = selectedLanguageId.value;

    clearResults();
}

function addTestCase() {
    testCases.value.push({
        key: nextTestCaseKey++,
        input: "",
    });

    activeTestCaseIndex.value = testCases.value.length - 1;
}

function clearResults() {
    terminalOutput.value = "";
    testResults.value = [];
    overallStatus.value = "";
    resultRuntime.value = "";
    resultComplexity.value = "";
    resultSpaceComplexity.value = "";
    complexityResult.value = "";
    spaceComplexityResult.value = "";
    activeResultCaseIndex.value = 0;
}

async function selectProblemTab(tab) {
    activeProblemTab.value = tab;

    if (tab === "submissions") {
        await loadSubmissions();
    }
}

async function loadSubmissions() {
    if (!problem.value || submissionsLoading.value) return;

    submissionsLoading.value = true;

    try {
        if (props.contestMode) {
            const route = frappe.get_route();

            const contestName = route[1];

            submissions.value = await call(
                "dsa.api.get_contest_submissions",
                {
                    contest: contestName,
                    problem: problem.value.name,
                }
            );

            return;
        }

        submissions.value = await call(
            "dsa.api.get_submissions",
            {
                problem: problem.value.name,
            }
        );
    } catch (error) {
        const message =
            error?.messages?.join("\n") ||
            error?.message ||
            __("Could not load submissions.");

        frappe.show_alert({
            message,
            indicator: "red",
        });
    } finally {
        submissionsLoading.value = false;
    }
}

function setPanelWidth(clientX) {
    const bounds = practiceShell.value?.getBoundingClientRect();

    if (!bounds) return;

    leftPanelWidth.value = Math.min(
        72,
        Math.max(
            28,
            ((clientX - bounds.left) / bounds.width) * 100
        )
    );

    monacoEditor.value?.layout();
}

function stopResize() {
    resizing.value = false;

    document.body.classList.remove("dsa-resizing");

    window.removeEventListener("pointermove", handleResize);
    window.removeEventListener("pointerup", stopResize);
}

function handleResize(event) {
    setPanelWidth(event.clientX);
}

function startResize(event) {
    if (window.matchMedia("(max-width: 900px)").matches) return;

    event.preventDefault();

    resizing.value = true;

    document.body.classList.add("dsa-resizing");

    window.addEventListener("pointermove", handleResize);
    window.addEventListener("pointerup", stopResize);
}

function resizeWithKeyboard(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;

    event.preventDefault();

    const direction = event.key === "ArrowLeft" ? -1 : 1;

    leftPanelWidth.value = Math.min(
        72,
        Math.max(
            28,
            leftPanelWidth.value + direction * 2
        )
    );

    monacoEditor.value?.layout();
}

async function call(method, args = {}, type = "GET") {
    const response = await frappe.call({
        method,
        args,
        type,
    });

    if (method === "dsa.api.run_code") {
        console.log("FULL FRAPPE RESPONSE:", response);
        console.log("MESSAGE:", response.message);
    }

    return response.message;
}

function sanitize(value) {
    const documentNode = new DOMParser().parseFromString(
        value || "",
        "text/html"
    );

    for (
        const element of documentNode.body.querySelectorAll(
            "script,style,iframe,object,embed,link"
        )
    ) {
        element.remove();
    }

    for (const element of documentNode.body.querySelectorAll("*")) {
        for (const attribute of [...element.attributes]) {
            const name = attribute.name.toLowerCase();

            if (
                name.startsWith("on") ||
                (
                    ["href", "src"].includes(name) &&
                    /^\s*javascript:/i.test(attribute.value)
                )
            ) {
                element.removeAttribute(attribute.name);
            }
        }
    }

    return documentNode.body.innerHTML;
}

function wait(milliseconds) {
    return new Promise((resolve) =>
        setTimeout(resolve, milliseconds)
    );
}

async function loadProblem(name) {
    if (!name) return;

    generation += 1;

    problem.value = await call(
        "dsa.api.get_problem",
        {
            name,
        }
    );

    selectedLanguageId.value = 54;
    previousLanguageId = 54;

    codeDrafts = Object.fromEntries(
        Object.entries(problem.value.starter_codes || {}).filter(
            ([, starterCode]) => starterCode
        )
    );

    code.value =
        codeDrafts[54] ||
        problem.value.starter_code ||
        languages[0].starter;

    testCases.value = (
        problem.value.test_cases || []
    ).map((testCase) => ({
        key: nextTestCaseKey++,
        input: testCase.input,
    }));

    if (!testCases.value.length) {
        testCases.value = [
            {
                key: nextTestCaseKey++,
                input: "",
            },
        ];
    }

    activeTestCaseIndex.value = 0;

    clearResults();

    activeProblemTab.value = "description";
    activeResultTab.value = "testcase";
    submissions.value = [];

if (props.contestMode) {
    await loadContestProgress();
}
}

onMounted(async () => {
    try {
        if (props.contestMode) {
            if (!props.problemName) {
                throw new Error(
                    __("No contest problem was specified.")
                );
            }

            await loadProblem(props.problemName);

            await startContestProblem();

            return;
        }

        const problems = await call(
            "dsa.api.get_problems"
        );

        if (!problems.length) return;

        const selector = props.page.add_field({
            fieldname: "dsa_problem",
            label: __("Problem"),
            fieldtype: "Select",
            options: problems.map((item) => ({
                label: `${item.title} · ${item.difficulty}`,
                value: item.name,
            })),
            change: () =>
                loadProblem(selector.get_value()),
        });

        selector.set_value(problems[0].name);

        await loadProblem(problems[0].name);
    } catch (error) {
        showError(error);
    } finally {
        loading.value = false;
    }
});

async function runCode() {
    const currentGeneration = ++generation;

    busy.value = true;

    clearResults();

    activeResultTab.value = "result";

    try {
        const input =
            testCases.value[activeTestCaseIndex.value]?.input || "";

        const queued = await call(
            "dsa.api.run_code",
            {
                problem: problem.value.name,
                code: code.value,
                stdin: input,
                language_id: selectedLanguageId.value,
                test_case_index:
                    activeTestCaseIndex.value + 1,
            },
            "POST"
        );
        console.log("RUN CODE RESPONSE:", queued);

        for (
            let attempt = 0;
            attempt < 60 &&
            generation === currentGeneration;
            attempt += 1
        ) {
            const result = await call(
                "dsa.api.get_run_result",
                {
                    token: queued.token,
                }
            );

            if (!result.pending) {
                const complexityRejected =
                    queued.complexity_result === "Too Complex" ||
                    queued.space_complexity_result === "Too Complex";

                overallStatus.value = complexityRejected
                    ? "Rejected"
                    : result.status || __("Finished");

                resultRuntime.value = result.time
                    ? `${result.time} s`
                    : "";

                resultComplexity.value = queued.complexity || "";
                resultSpaceComplexity.value = queued.space_complexity || "";
                complexityResult.value = queued.complexity_result || "";
                spaceComplexityResult.value = queued.space_complexity_result || "";

                testResults.value = [
                    {
                        index:
                            activeTestCaseIndex.value + 1,
                        status: result.status,
                        input,
                        expected_output:
                            result.expected_output,
                        actual_output:
                            result.stdout,
                        error:
                            result.compile_output ||
                            result.stderr ||
                            result.message,
                    },
                ];

                return;
            }

            await wait(1000);
        }

        terminalOutput.value = __(
            "Execution timed out while waiting for Judge0."
        );
    } catch (error) {
        showError(error);
    } finally {
        busy.value = false;
    }
}

async function submitCode() {
    const currentGeneration = ++generation;

    busy.value = true;

    clearResults();

    activeResultTab.value = "result";

    try {
        const method = props.contestMode
            ? "dsa.api.submit_contest_code"
            : "dsa.api.submit_code";

        const args = props.contestMode
            ? {
                  contest: frappe.get_route()[1],
                  problem: problem.value.name,
                  code: code.value,
                  language_id: selectedLanguageId.value,
              }
            : {
                  problem: problem.value.name,
                  code: code.value,
                  language_id: selectedLanguageId.value,
              };

        const queued = await call(
            method,
            args,
            "POST"
        );

        resultComplexity.value = queued.complexity || "";
        resultSpaceComplexity.value =
            queued.space_complexity || "";
        complexityResult.value =
            queued.complexity_result || "";
        spaceComplexityResult.value =
            queued.space_complexity_result || "";

        for (
            let attempt = 0;
            attempt < 60 &&
            generation === currentGeneration;
            attempt += 1
        ) {
            const result = await call(
                props.contestMode
                    ? "dsa.api.get_contest_submission_result"
                    : "dsa.api.get_submission_result",
                {
                    submission: props.contestMode
                        ? queued.contest_submission
                        : queued.submission,
                }
            );

            resultComplexity.value =
                result.time_complexity ||
                queued.complexity ||
                "";

            resultSpaceComplexity.value =
                result.space_complexity ||
                queued.space_complexity ||
                "";

            complexityResult.value =
                result.complexity_result ||
                queued.complexity_result ||
                "";

            spaceComplexityResult.value =
                result.space_complexity_result ||
                queued.space_complexity_result ||
                "";

            overallStatus.value =
                result.display_status ||
                result.status ||
                __("Finished");

            testResults.value = result.results || [];

            if (!result.pending) {
            await loadSubmissions();

            if (props.contestMode) {
                const accepted =
                    result.status === "Accepted" ||
                    result.status_id === 3;

                if (accepted) {
                    submissionMade.value = true;
                    clearInterval(timerInterval);
                }

                await loadContestProgress();
            }

            return;
        }

            await wait(1000);
        }

        terminalOutput.value = __(
            "Submission timed out while waiting for Judge0."
        );
    } catch (error) {
        showError(error);
    } finally {
        busy.value = false;
    }
}

async function loadContestProgress() {
    if (!props.contestMode) return;

    const route = frappe.get_route();
    const contestName = route[1];

    if (!contestName) return;

    contestProgressLoading.value = true;

    try {
        contestProgress.value = await call(
            "dsa.api.get_contest_progress",
            {
                contest: contestName,
            }
        );
    } catch (error) {
        console.error(
            "Failed to load contest progress:",
            error
        );
    } finally {
        contestProgressLoading.value = false;
    }
}

function showError(error) {
    const message =
        error?.messages?.join("\n") ||
        error?.message ||
        __("Something went wrong.");

    testResults.value = [];
    overallStatus.value = "";
    terminalOutput.value = message;

    frappe.show_alert({
        message,
        indicator: "red",
    });
}

function refresh() {
    monacoEditor.value?.layout();
}


async function setContestProblem(contest, newProblemName) {
    if (!newProblemName) return;
    loading.value = true;
    try {
        await loadProblem(newProblemName);

        if (props.contestMode) {
            await startContestProblem();
            await loadContestProgress();
        }
    } catch (error) {
        showError(error);
    } finally {
        loading.value = false;
    }
}

defineExpose({
    refresh,
    loadProblem,
    setContestProblem,
});

onBeforeUnmount(() => {
    stopResize();
    clearInterval(timerInterval);
});
</script>

<style scoped>
.dsa-state {
    min-height: 600px;
    display: grid;
    place-items: center;
    color: var(--text-muted);
}

.dsa-practice-shell {
    height: calc(100vh - 118px);
    min-height: 650px;
    overflow: hidden;
    background: #191919;
    color: #f2f2f2;
}

.dsa-panels {
    display: grid;
    height: 100%;
    grid-template-columns: minmax(0, var(--left-panel-width)) 10px minmax(0, 1fr);
    background: #111;
}

.dsa-pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #242424;
}

.dsa-problem-pane {
    display: flex;
    flex-direction: column;
}

.dsa-tabbar,
.dsa-panel-title,
.dsa-editor-toolbar,
.dsa-terminal-header {
    background: #333;
}

.dsa-tabbar {
    display: flex;
    height: 45px;
    flex: 0 0 45px;
    align-items: stretch;
    overflow-x: auto;
    border-bottom: 1px solid #383838;
}

.dsa-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    color: #a9a9a9;
    font-size: 13px;
    white-space: nowrap;
}

.dsa-tab + .dsa-tab::before {
    position: absolute;
    left: 0;
    width: 1px;
    height: 18px;
    background: #555;
    content: "";
}

.dsa-tab.is-active {
    color: #f4f4f4;
}

.dsa-tab-icon {
    font-size: 16px;
    line-height: 1;
}

.blue {
    color: #168fff;
}

.amber {
    color: #d9a52b;
}

.green,
.dsa-code-icon {
    color: #21b657;
}

.dsa-statement {
    min-width: 0;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 22px 20px 56px;
}

.dsa-statement h1 {
    margin: 0;
    color: #f5f5f5;
    font-size: 22px;
    font-weight: 650;
}

.dsa-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
}

.dsa-difficulty,
.dsa-chip {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    background: #353535;
    color: #d1d1d1;
    font-size: 11px;
    line-height: 1;
}

.dsa-difficulty {
    background: rgba(31, 169, 113, 0.15);
    color: #47b995;
    text-transform: capitalize;
}

.dsa-chip.amber {
    color: #e3b342;
}

.dsa-statement section {
    margin-top: 28px;
}

.dsa-statement h3 {
    margin: 0 0 12px;
    color: #f1f1f1;
    font-size: 14px;
    font-weight: 650;
}

.dsa-rich-text {
    color: #ffffff;
    font-size: 13px;
    line-height: 1.65;
}

.dsa-rich-text :deep(p),
.dsa-rich-text :deep(span),
.dsa-rich-text :deep(div),
.dsa-rich-text :deep(li),
.dsa-rich-text :deep(ul),
.dsa-rich-text :deep(ol),
.dsa-rich-text :deep(strong),
.dsa-rich-text :deep(em),
.dsa-rich-text :deep(b),
.dsa-rich-text :deep(i) {
    color: #ffffff;
}

.dsa-rich-text :deep(a) {
    color: #6ea8fe;
}

.dsa-rich-text :deep(h1),
.dsa-rich-text :deep(h2),
.dsa-rich-text :deep(h3),
.dsa-rich-text :deep(h4),
.dsa-rich-text :deep(h5),
.dsa-rich-text :deep(h6) {
    color: #ffffff;
}

.dsa-rich-text :deep(pre) {
    padding: 12px 14px;
    border-left: 2px solid #454545;
    border-radius: 0;
    background: transparent;
    color: #d8d8d8;
    white-space: pre-wrap;
}

.dsa-rich-text :deep(code) {
    padding: 2px 5px;
    border: 1px solid #505050;
    border-radius: 5px;
    background: #3a3a3a;
    color: #d2d2d2;
}

.dsa-tab-content {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 22px 20px;
}

.dsa-tab-empty {
    display: grid;
    min-height: 180px;
    place-items: center;
    color: #777;
    text-align: center;
}

.dsa-tab-empty h2 {
    margin: 0 0 8px;
    color: #ddd;
    font-size: 18px;
}

.dsa-tab-empty p {
    margin: 0;
}

.dsa-content-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.dsa-content-heading h2 {
    margin: 0;
    color: #eee;
    font-size: 18px;
}

.dsa-content-heading button {
    padding: 5px 9px;
    border: 1px solid #505050;
    border-radius: 5px;
    background: #363636;
    color: #ccc;
    font-size: 11px;
}

.dsa-content-heading button:disabled {
    opacity: 0.5;
}

.dsa-submission-card {
    margin-bottom: 10px;
    overflow: hidden;
    border: 1px solid #414141;
    border-radius: 7px;
    background: #292929;
}

.dsa-submission-card > div {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    color: #999;
    font-size: 11px;
}

.dsa-submission-card strong {
    font-weight: 600;
}

.dsa-submission-main {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.submission-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.submission-status.accepted {
    color: #42b883;
}

.submission-status.wrong-answer {
    color: #e45757;
}

.submission-status.runtime-error {
    color: #e08b45;
}

.submission-status.compilation-error {
    color: #d56be0;
}

.submission-status.running,
.submission-status.queued {
    color: #d9a52b;
}

.submission-score {
    color: #e3b342;
    font-weight: 600;
}

.dsa-submission-card time {
    margin-left: auto;
}

.dsa-submission-card pre {
    max-height: 280px;
    margin: 0;
    overflow: auto;
    padding: 14px;
    border-top: 1px solid #414141;
    border-radius: 0;
    background: #202020;
    color: #ddd;
    font-size: 12px;
}

.dsa-resizer {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    cursor: col-resize;
    touch-action: none;
    outline: none;
}

.dsa-resizer::before {
    width: 2px;
    height: 100%;
    background: #303030;
    content: "";
    transition: background 0.15s;
}

.dsa-resizer span {
    position: absolute;
    width: 3px;
    height: 42px;
    border-radius: 2px;
    background: #5a5a5a;
    opacity: 0;
    transition: opacity 0.15s;
}

.dsa-resizer:hover::before,
.dsa-resizer:focus::before,
.is-resizing .dsa-resizer::before {
    background: #4b8bf5;
}

.dsa-resizer:hover span,
.dsa-resizer:focus span,
.is-resizing .dsa-resizer span {
    opacity: 1;
}

.dsa-solution {
    display: grid;
    grid-template-rows: minmax(300px, 55%) minmax(150px, 1fr);
    gap: 10px;
    border: 0;
    border-radius: 0;
    background: #111;
}

.dsa-code-panel,
.dsa-terminal {
    min-height: 0;
    overflow: hidden;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #242424;
}

.dsa-code-panel {
    display: flex;
    flex-direction: column;
}

.dsa-panel-title {
    display: flex;
    height: 44px;
    flex: 0 0 44px;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
}

.dsa-panel-title strong {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
}

.dsa-code-icon {
    font-size: 14px;
    font-weight: 700;
}

.dsa-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.dsa-timer {
    display: inline-flex;
    height: 28px;
    min-width: 58px;
    align-items: center;
    justify-content: center;
    margin-left: 4px;
    padding: 0 9px;
    border: 1px solid #4a4a4a;
    border-radius: 5px;
    background: #292929;
    color: #e8e8e8;
    font-family: var(--font-stack-monospace);
    font-size: 11px;
    font-weight: 600;
}

.dsa-button {
    display: inline-flex;
    height: 28px;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border: 0;
    border-radius: 5px;
    color: #eee;
    font-size: 11px;
    font-weight: 600;
}

.dsa-button span {
    width: 13px;
    height: 13px;
}

.dsa-button:disabled {
    opacity: 0.55;
}

.dsa-run {
    background: #4a4a4a;
}

.dsa-run:hover:not(:disabled) {
    background: #575757;
}

.dsa-submit {
    background: #1e8e4d;
}

.dsa-submit:hover:not(:disabled) {
    background: #24a45a;
}

.dsa-editor-toolbar {
    display: flex;
    height: 38px;
    flex: 0 0 38px;
    align-items: center;
    gap: 18px;
    padding: 0 12px;
    border-top: 1px solid #383838;
    border-bottom: 1px solid #444;
    color: #bbb;
    font-size: 12px;
}

.dsa-language-select {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.dsa-language-select select {
    min-width: 62px;
    padding: 0 16px 0 0;
    border: 0;
    outline: none;
    appearance: none;
    background: transparent;
    color: #c7c7c7;
    font: inherit;
    cursor: pointer;
}

.dsa-language-select select:disabled {
    cursor: wait;
    opacity: 0.6;
}

.dsa-language-select select option {
    background: #333;
    color: #eee;
}

.dsa-language-select .dsa-chevron {
    position: absolute;
    right: 0;
    pointer-events: none;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
}

.dsa-chevron {
    color: #888;
}

.dsa-lock {
    color: #aaa;
    font-size: 8px;
}

.dsa-editor-area {
    min-height: 0;
    flex: 1;
    overflow: hidden;
}

.dsa-editor-status {
    display: flex;
    height: 28px;
    flex: 0 0 28px;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    color: #777;
    font-size: 10px;
}

.dsa-terminal {
    color: #e5e5e5;
}

.dsa-terminal-header {
    display: flex;
    height: 42px;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid #383838;
}

.dsa-result-tabs {
    display: flex;
    height: 100%;
    align-items: stretch;
    gap: 18px;
}

.dsa-result-tabs > button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #aaa;
    font-size: 12px;
}

.dsa-result-tabs > button + button {
    position: relative;
}

.dsa-result-tabs > button + button::before {
    position: absolute;
    left: -10px;
    width: 1px;
    height: 18px;
    background: #555;
    content: "";
}

.dsa-result-tabs .is-active {
    color: #eee;
}

.dsa-terminal-header button {
    border: 0;
    background: transparent;
    color: #999;
    font-size: 11px;
}

.dsa-terminal-header button:hover {
    color: #fff;
}

.dsa-terminal-output {
    position: relative;
    height: calc(100% - 42px);
    overflow-y: auto;
    padding: 14px 16px;
    font-family: var(--font-stack-monospace);
    font-size: 12px;
}

.dsa-terminal-output pre {
    margin: 0;
    background: transparent;
    color: #ddd;
    white-space: pre-wrap;
}

.dsa-empty-result {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #626262;
    font-family: var(--font-stack);
}

.dsa-testcase-input {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    gap: 10px;
}

.dsa-testcase-input label {
    color: #bbb;
    font-family: var(--font-stack);
    font-size: 11px;
    font-weight: 600;
}

.dsa-testcase-input textarea {
    min-height: 105px;
    resize: vertical;
    border: 1px solid #444;
    border-radius: 7px;
    outline: none;
    background: #383838;
    color: #f0f0f0;
    font: inherit;
    padding: 12px;
}

.dsa-testcase-input textarea:focus {
    border-color: #4b8bf5;
}

.dsa-case-tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.dsa-case-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #aaa;
    font-family: var(--font-stack);
    font-size: 12px;
}

.dsa-case-tabs button:hover {
    background: #303030;
    color: #ddd;
}

.dsa-case-tabs button.is-active {
    background: #414141;
    color: #fff;
}

.dsa-case-tabs .dsa-add-case {
    padding: 0 11px;
    color: #777;
    font-size: 20px;
}

.dsa-results {
    font-family: var(--font-stack);
}

.dsa-result-summary {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 18px;
}

.dsa-result-summary strong {
    color: #e05757;
    font-size: 20px;
    font-weight: 500;
}

.dsa-result-summary strong.accepted {
    color: #28c76f;
}

.dsa-result-summary strong.running,
.dsa-result-summary span {
    color: #999;
}

.result-cases {
    margin-bottom: 16px;
}

.case-pass {
    color: #28c76f;
    font-size: 9px;
}

.case-fail {
    color: #e05757;
    font-size: 9px;
}

.dsa-result-details {
    display: grid;
    gap: 8px;
}

.dsa-result-details label {
    margin-top: 4px;
    color: #999;
    font-size: 11px;
}

.dsa-result-details pre {
    min-height: 54px;
    padding: 12px;
    border-radius: 7px;
    background: #383838;
    color: #eee;
}

.dsa-result-details pre.is-error {
    color: #ff8b8b;
}

.dsa-muted {
    color: #777;
}

@media (max-width: 900px) {
    .dsa-practice-shell {
        height: auto;
        min-height: 0;
    }

    .dsa-panels {
        display: block;
        height: auto;
    }

    .dsa-problem-pane {
        height: 520px;
    }

    .dsa-resizer {
        display: none;
    }

    .dsa-solution {
        height: 700px;
    }
}
.contest-progress {
    margin-top: 22px;
    padding: 14px;
    border: 1px solid #414141;
    border-radius: 8px;
    background: #292929;
}

.contest-progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    color: #ddd;
    font-size: 12px;
}

.contest-progress-header strong {
    color: #eee;
}

.contest-progress-header span {
    color: #999;
}

.contest-progress-header b {
    color: #e3b342;
}

.contest-progress-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.progress-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px;
    border-radius: 6px;
    background: #343434;
}

.progress-item strong {
    font-size: 17px;
}

.progress-item span {
    color: #888;
    font-size: 10px;
}

.progress-item.solved strong {
    color: #42b883;
}

.progress-item.attempted strong {
    color: #d9a52b;
}

.progress-item.unsolved strong {
    color: #999;
}

@media (max-width: 600px) {
    .contest-progress-stats {
        grid-template-columns: 1fr;
    }

    .dsa-submission-main {
        flex-wrap: wrap;
    }

    .dsa-submission-card time {
        width: 100%;
        margin-left: 0;
    }
}

.submission-status.accepted { color: #28c76f; }
.submission-status.wrong-answer, .submission-status.failed { color: #e05757; }
.submission-status.time-limit-exceeded { color: #ff9f43; }
.submission-status.compilation-error { color: #ea5455; }
.submission-status.runtime-error { color: #f5365c; }
.submission-status.running, .submission-status.queued { color: #5e72e4; }

</style>

<style>
.dsa-page-container {
    max-width: none !important;
    padding-right: 6px;
    padding-left: 6px;
}

body.dsa-resizing {
    cursor: col-resize !important;
    user-select: none !important;
}
.complexity-result {
    margin-left: 6px;
    font-weight: 500;
}

.complexity-result.optimal {
    color: #28c76f;
}

.complexity-result.too-complex {
    color: #e05757;
}

.complexity-result.unknown {
    color: #999;
}
</style>