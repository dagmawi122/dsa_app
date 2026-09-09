<template>
	<div class="dsa-practice-view" :class="{ 'is-standalone': !props.contestMode }">
		<header v-if="!props.contestMode" class="dsa-practice-navigation">
			<a href="/app/list-problems" class="dsa-back-button"
				><svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
				>
					<path d="m10 6-6 6 6 6M4 12h16" /></svg
				>{{ __("Problem list") }}</a
			>
			<div class="dsa-nav-title">
				<span>{{ __("DSA Practice") }}</span
				><span aria-hidden="true">/</span
				><strong>{{ problem?.title || __("Loading problem…") }}</strong>
			</div>
			<span class="dsa-nav-mark" aria-hidden="true">&lt;/&gt;</span>
		</header>
		<div v-if="loading" class="dsa-state">{{ __("Loading problem…") }}</div>
		<div v-else class="dsa-practice-content">
			<p v-if="!problem" role="alert">
				{{ __("Problem not found or could not be loaded.") }}
			</p>
			<div
				v-if="problem"
				ref="practiceShell"
				class="dsa-practice-shell"
				:class="{ 'is-resizing': resizing }"
			>
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
								<details class="dsa-problem-topics">
									<summary class="dsa-chip">◇ {{ __("Topics") }}</summary>
									<div class="dsa-topic-links">
										<a
											v-for="topic in problem.topics"
											:key="topic"
											class="dsa-chip dsa-topic-link"
											:href="
												'/app/list-problems?topic=' +
												encodeURIComponent(topic)
											"
											:aria-label="__('Find problems about') + ' ' + topic"
											>{{ topic }}</a
										>
										<span v-if="!problem.topics?.length" class="dsa-muted">{{
											__("No topics assigned")
										}}</span>
									</div>
								</details>
								<button
                                    v-if="problem.hint"
                                    type="button"
                                    class="dsa-chip hint-button"
                                    @click="showHint = !showHint"
                                >
                                    ♧ {{ __("Hint") }}
                                </button>
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
							<section v-if="problem.hint && showHint">
                                <h3>{{ __("Hint") }}</h3>
                                <div class="dsa-rich-text" v-html="safeHint"></div>
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

									<time>{{ formatSubmissionTime(submission) }}</time>
								</div>

								<div
									v-if="hasStats(submission)"
									class="dsa-submission-stats"
								>
									<span v-if="submission.runtime" class="stat-chip">
										<span class="stat-icon" aria-hidden="true">◷</span>
										<span class="stat-label">{{ __("Runtime") }}</span>
										<span class="stat-value">{{
											formatRuntime(submission.runtime)
										}}</span>
									</span>

									<span v-if="submission.time_complexity" class="stat-chip">
										<span class="stat-icon" aria-hidden="true">Σ</span>
										<span class="stat-label">{{ __("Time") }}</span>
										<span class="stat-value">{{
											submission.time_complexity
										}}</span>
										<span
											class="complexity-result"
											:class="complexityResultClass(submission.complexity_result)"
										>
											<span class="complexity-result-icon" aria-hidden="true">{{
												complexityResultIcon(submission.complexity_result)
											}}</span>
											{{ complexityResultLabel(submission.complexity_result) }}
										</span>
									</span>

									<span v-if="submission.space_complexity" class="stat-chip">
										<span class="stat-icon" aria-hidden="true">▭</span>
										<span class="stat-label">{{ __("Space") }}</span>
										<span class="stat-value">{{
											submission.space_complexity
										}}</span>
										<span
											class="complexity-result"
											:class="complexityResultClass(submission.space_complexity_result)"
										>
											<span class="complexity-result-icon" aria-hidden="true">{{
												complexityResultIcon(submission.space_complexity_result)
											}}</span>
											{{ complexityResultLabel(submission.space_complexity_result) }}
										</span>
									</span>
								</div>

								<div class="dsa-submission-actions">
									<span>{{ submissionLanguage(submission) }}</span>
									<button
										type="button"
										:aria-expanded="expandedSubmission === submission.name"
										@click="
											expandedSubmission =
												expandedSubmission === submission.name
													? null
													: submission.name
										"
									>
										{{
											expandedSubmission === submission.name
												? __("Hide code")
												: __("View code")
										}}
									</button>
									<button
										type="button"
										:disabled="busy || typeof submission.code !== 'string'"
										@click="loadSubmissionCode(submission)"
									>
										{{ __("Load into editor") }}
									</button>
								</div>
								<pre
									v-if="expandedSubmission === submission.name"
								><code>{{ submission.code ?? __("Code is unavailable for this submission.") }}</code></pre>
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
										<svg
											v-if="!busy"
											class="dsa-button-icon"
											viewBox="0 0 24 24"
											fill="currentColor"
											aria-hidden="true"
										>
											<path d="M7 4.5v15l13-7.5-13-7.5z" />
										</svg>
										<span v-else class="dsa-button-spinner" aria-hidden="true"></span>
										{{ __("Run") }}
									</button>

									<button
										type="button"
										class="dsa-button dsa-submit"
										:disabled="busy"
										@click="submitCode"
									>
										<svg
											v-if="!busy"
											class="dsa-button-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										<span v-else class="dsa-button-spinner" aria-hidden="true"></span>
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
									v-if="
										activeResultTab === 'result' &&
										(terminalOutput || testResults.length)
									"
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

									<label for="dsa-stdin"> {{ __("Input") }} = </label>

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
										</div>

										<div
											v-if="resultComplexity || resultSpaceComplexity"
											class="dsa-complexity-info"
										>
											<div class="dsa-complexity-row">
												<label>{{ __("Time Complexity") }}</label>
												<span>
													{{ resultComplexity || __("Unknown") }}
													<span
														class="complexity-result"
														:class="complexityResultClass(complexityResult)"
													>
														<span class="complexity-result-icon" aria-hidden="true">{{
															complexityResultIcon(complexityResult)
														}}</span>
														{{ complexityResultLabel(complexityResult) }}
													</span>
												</span>
											</div>

											<div class="dsa-complexity-row">
												<label>{{ __("Space Complexity") }}</label>
												<span>
													{{ resultSpaceComplexity || __("Unknown") }}
													<span
														class="complexity-result"
														:class="complexityResultClass(spaceComplexityResult)"
													>
														<span class="complexity-result-icon" aria-hidden="true">{{
															complexityResultIcon(spaceComplexityResult)
														}}</span>
														{{ complexityResultLabel(spaceComplexityResult) }}
													</span>
												</span>
											</div>
										</div>

										<div class="dsa-case-tabs result-cases">
											<button
												v-for="(result, index) in testResults"
												:key="result.index"
												type="button"
												:class="{
													'is-active': activeResultCaseIndex === index,
												}"
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

										<div v-if="activeTestResult" class="dsa-result-details">
											<label>{{ __("Input") }}</label>
											<pre>{{
												activeTestResult.input || __("No input")
											}}</pre>

											<label
												v-if="
													activeTestResult.expected_output !== undefined
												"
											>
												{{ __("Expected Output") }}
											</label>

											<pre
												v-if="
													activeTestResult.expected_output !== undefined
												"
											>
                                        {{ activeTestResult.expected_output || __("No output") }}
                                    </pre
											>

											<label>
												{{
													activeTestResult.error
														? __("Error")
														: __("Output")
												}}
											</label>

											<pre :class="{ 'is-error': activeTestResult.error }">
                                        {{
													activeTestResult.error ||
													activeTestResult.actual_output ||
													__("No output")
												}}
                                    </pre
											>
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
		</div>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import MonacoEditor from "./MonacoEditor.vue";

const elapsedTime = ref(0);
let timerInterval = null;
let disposed = false;

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
	problemSlug: {
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
const showHint = ref(false);
const activeResultTab = ref("testcase");
const submissions = ref([]);
const expandedSubmission = ref(null);
const submissionsLoading = ref(false);
const monacoEditor = ref(null);
const practiceShell = ref(null);
const leftPanelWidth = ref(50);
const resizing = ref(false);
const contestProgress = ref(null);
const contestProgressLoading = ref(false);
const submissionMade = ref(false);

let generation = 0;
let nextTestCaseKey = 2;
let previousLanguageId = 54;
let codeDrafts = {};

const safeDescription = computed(() => sanitize(problem.value?.description));

const safeExamples = computed(() => sanitize(problem.value?.examples));

const safeConstraints = computed(() => sanitize(problem.value?.constraints));

const safeHint = computed(() => sanitize(problem.value?.hint));

const panelStyle = computed(() => ({
	"--left-panel-width": `${leftPanelWidth.value}%`,
}));

const selectedLanguage = computed(
	() => languages.find((language) => language.id === selectedLanguageId.value) || languages[0]
);

const activeTestResult = computed(() => testResults.value[activeResultCaseIndex.value] || null);

function formatTime(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// Formats a raw runtime value (seconds, as returned by Judge0 — e.g. "0.03")
// into a short human-readable string: sub-second runtimes are shown in
// milliseconds, anything at or above 1s is shown in seconds.
function formatRuntime(runtime) {
	const seconds = Number(runtime);

	if (!Number.isFinite(seconds) || seconds < 0) {
		return null;
	}

	if (seconds === 0) {
		return "0 ms";
	}

	if (seconds < 1) {
		return `${Math.round(seconds * 1000)} ms`;
	}

	return `${seconds.toFixed(2)} s`;
}

// Whether a submission has any of the 5 result fields worth rendering as a
// stats row (runtime, time complexity, space complexity).
function hasStats(submission) {
	return Boolean(
		submission?.runtime || submission?.time_complexity || submission?.space_complexity
	);
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
		rejected: __("Rejected"),
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

	if (normalized === "rejected") {
		return "⚠";
	}

	return "✕";
}

// Maps a raw complexity_result / space_complexity_result value ("Optimal",
// "Too Complex", or missing) to the CSS class used for the pill next to the
// Big-O readout (.optimal / .too-complex / .unknown, defined in <style>).
function complexityResultClass(result) {
	const normalized = String(result || "").toLowerCase();

	if (normalized === "optimal") {
		return "optimal";
	}

	if (normalized === "too complex") {
		return "too-complex";
	}

	return "unknown";
}

function complexityResultLabel(result) {
	return result || __("Unknown");
}

// Small glyph shown beside the Optimal / Too Complex / Unknown pill —
// a checkmark for a pass, a warning triangle for a complexity rejection.
function complexityResultIcon(result) {
	const normalized = String(result || "").toLowerCase();

	if (normalized === "optimal") {
		return "✓";
	}

	if (normalized === "too complex") {
		return "⚠";
	}

	return "";
}

// A run/submission is Rejected — regardless of whether the tests themselves
// passed — if either the time or space complexity came back "Too Complex".
function isComplexityRejected(...results) {
	return results.some((result) => result === "Too Complex");
}

function formatSubmissionTime(submission) {
	return submission.submission_time || submission.creation || "—";
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

			submissions.value = await call("dsa.api.get_contest_submissions", {
				contest: contestName,
				problem: problem.value.name,
			});

			return;
		}

		submissions.value = await call("dsa.api.get_submissions", {
			problem: problem.value.name,
		});
	} catch (error) {
		const message =
			error?.messages?.join("\n") || error?.message || __("Could not load submissions.");

		frappe.show_alert({
			message,
			indicator: "red",
		});
	} finally {
		submissionsLoading.value = false;
	}
}

function submissionLanguage(submission) {
	return (
		languages.find((language) => language.id === Number(submission.language_id))?.label ||
		__("Unknown language")
	);
}

function loadSubmissionCode(submission) {
	if (busy.value || typeof submission.code !== "string") return;
	const languageId = Number(submission.language_id);
	if (!languages.some((language) => language.id === languageId)) {
		frappe.show_alert({
			message: __("This submission's language is not supported."),
			indicator: "red",
		});
		return;
	}
	const problemName = problem.value?.name;
	const restore = () => {
		if (busy.value || problem.value?.name !== problemName) return;
		codeDrafts[selectedLanguageId.value] = code.value;
		selectedLanguageId.value = languageId;
		previousLanguageId = languageId;
		codeDrafts[languageId] = submission.code;
		code.value = submission.code;
		clearResults();
		frappe.show_alert({ message: __("Submission loaded into editor."), indicator: "green" });
	};
	if (
		code.value &&
		(code.value !== submission.code || selectedLanguageId.value !== languageId)
	) {
		frappe.confirm(
			__(
				"Replace the current editor code with this submission? Unsaved changes in the target language will be replaced."
			),
			restore
		);
	} else {
		restore();
	}
}

function setPanelWidth(clientX) {
	const bounds = practiceShell.value?.getBoundingClientRect();

	if (!bounds) return;

	leftPanelWidth.value = Math.min(
		72,
		Math.max(28, ((clientX - bounds.left) / bounds.width) * 100)
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

	leftPanelWidth.value = Math.min(72, Math.max(28, leftPanelWidth.value + direction * 2));

	monacoEditor.value?.layout();
}

async function call(method, args = {}, type = "GET") {
	const response = await frappe.call({
		method,
		args,
		type,
	});

    return response.message;
}

function sanitize(value) {
	const documentNode = new DOMParser().parseFromString(value || "", "text/html");

	for (const element of documentNode.body.querySelectorAll(
		"script,style,iframe,object,embed,link"
	)) {
		element.remove();
	}

	for (const element of documentNode.body.querySelectorAll("*")) {
		for (const attribute of [...element.attributes]) {
			const name = attribute.name.toLowerCase();

			if (
				name.startsWith("on") ||
				(["href", "src"].includes(name) && /^\s*javascript:/i.test(attribute.value))
			) {
				element.removeAttribute(attribute.name);
			}
		}
	}

	return documentNode.body.innerHTML;
}

function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadProblem(name, slug = null) {
	if (!name && !slug) return;

	expandedSubmission.value = null;
	generation += 1;

	const loadedProblem = await call("dsa.api.get_problem", { name, slug });
	if (disposed) return;
	problem.value = loadedProblem;
	updatePageTitle();

	selectedLanguageId.value = 54;
	previousLanguageId = 54;

	codeDrafts = Object.fromEntries(
		Object.entries(problem.value.starter_codes || {}).filter(([, starterCode]) => starterCode)
	);

	code.value = codeDrafts[54] || problem.value.starter_code || languages[0].starter;

	testCases.value = (problem.value.test_cases || []).map((testCase) => ({
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
	showHint.value = false;
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
				throw new Error(__("No contest problem was specified."));
			}

			await loadProblem(props.problemName);

            await startContestProblem();

			return;
		}

		await loadProblem(null, props.problemSlug);
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
				test_case_index: activeTestCaseIndex.value + 1,
			},
			"POST"
		);

		for (
			let attempt = 0;
			attempt < 60 && generation === currentGeneration;
			attempt += 1
		) {
			const result = await call("dsa.api.get_run_result", {
				token: queued.token,
			});

			if (!result.pending) {
				resultComplexity.value = queued.complexity || "";
				resultSpaceComplexity.value = queued.space_complexity || "";
				complexityResult.value = queued.complexity_result || "";
				spaceComplexityResult.value = queued.space_complexity_result || "";

				const complexityRejected = isComplexityRejected(
					complexityResult.value,
					spaceComplexityResult.value
				);

				overallStatus.value = complexityRejected
					? "Rejected"
					: result.status || __("Finished");

				resultRuntime.value = result.time
					? formatRuntime(result.time)
					: "";

				testResults.value = [
					{
						index: activeTestCaseIndex.value + 1,
						status: complexityRejected ? "Rejected" : result.status,
						input,
						expected_output: result.expected_output,
						actual_output: result.stdout,
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

            // A submission is Rejected the moment either complexity metric
            // comes back "Too Complex" — this overrides the raw judge
            // status (which may otherwise say "Accepted" purely on
            // correctness) the same way runCode() already does for a
            // single test run.
            const complexityRejected = isComplexityRejected(
                complexityResult.value,
                spaceComplexityResult.value
            );

            overallStatus.value = complexityRejected
                ? "Rejected"
                : result.display_status || result.status || __("Finished");

            resultRuntime.value = result.runtime
                ? formatRuntime(result.runtime)
                : resultRuntime.value;

            testResults.value = (result.results || []).map((testResult) =>
                complexityRejected
                    ? { ...testResult, status: "Rejected" }
                    : testResult
            );

            if (!result.pending) {
            await loadSubmissions();

            if (props.contestMode) {
                const accepted =
                    !complexityRejected &&
                    (result.status === "Accepted" || result.status_id === 3);

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

		terminalOutput.value = __("Submission timed out while waiting for Judge0.");
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
		contestProgress.value = await call("dsa.api.get_contest_progress", {
			contest: contestName,
		});
	} catch (error) {
		console.error("Failed to load contest progress:", error);
	} finally {
		contestProgressLoading.value = false;
	}
}

function showError(error) {
	const message = error?.messages?.join("\n") || error?.message || __("Something went wrong.");

	testResults.value = [];
	overallStatus.value = "";
	terminalOutput.value = message;

	frappe.show_alert({
		message,
		indicator: "red",
	});
}

function refresh() {
	updatePageTitle();
	monacoEditor.value?.layout();
}

function updatePageTitle() {
	if (!props.contestMode && problem.value && frappe.get_route()[0] === "dsa-practice") {
		props.page.set_title(`${__("DSA Practice")} / ${problem.value.title}`);
	}
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
	disposed = true;
	generation += 1;
	stopResize();
	clearInterval(timerInterval);
});
</script>

<style scoped>
.dsa-practice-view {
	color: var(--text-color);
	background: var(--bg-color);
}
.dsa-practice-view.is-standalone {
	height: 100dvh;
	display: flex;
	flex-direction: column;
	padding: 0 10px 10px;
}
.dsa-practice-content {
	min-height: 0;
	flex: 1;
}
.is-standalone .dsa-practice-shell {
	height: 100%;
	min-height: 0;
}
.dsa-practice-navigation {
	display: flex;
	align-items: center;
	gap: 20px;
	min-height: 58px;
	flex-shrink: 0;
	padding: 8px 4px;
}
.dsa-back-button {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border: 1px solid var(--border-color);
	border-radius: 7px;
	background: var(--card-bg);
	color: var(--text-color);
	font-size: 12px;
	font-weight: 550;
	text-decoration: none;
	white-space: nowrap;
}
.dsa-back-button svg {
	width: 15px;
	height: 15px;
}
.dsa-back-button:hover {
	background: var(--fg-hover-color);
	color: var(--text-color);
}
.dsa-back-button:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 2px;
}
.dsa-nav-title {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	font-size: 12px;
	color: var(--text-muted);
}
.dsa-nav-title strong {
	color: var(--text-color);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 550;
}
.dsa-nav-mark {
	margin-left: auto;
	color: var(--text-muted);
	font-size: 18px;
}
.dsa-problem-topics {
	min-width: 0;
}
.dsa-problem-topics summary {
	cursor: pointer;
}
.dsa-topic-links {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding-top: 10px;
	max-width: min(360px, 60vw);
}
.dsa-topic-links .dsa-topic-link {
	background: var(--bg-blue);
	color: var(--text-on-blue);
	text-decoration: none;
	line-height: 1.4;
}
.dsa-topic-links .dsa-topic-link:hover {
	text-decoration: underline;
}
.dsa-problem-topics summary:focus-visible,
.dsa-topic-link:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 3px;
}

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
	background: var(--bg-color);
	color: var(--text-color);
}

.dsa-panels {
	display: grid;
	height: 100%;
	grid-template-columns: minmax(0, var(--left-panel-width)) 10px minmax(0, 1fr);
	background: var(--bg-color);
}

.dsa-pane {
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
}

.dsa-problem-pane {
	display: flex;
	flex-direction: column;
}

.dsa-tabbar,
.dsa-panel-title,
.dsa-editor-toolbar,
.dsa-terminal-header {
	background: var(--control-bg);
}

.dsa-tabbar {
	display: flex;
	height: 45px;
	flex: 0 0 45px;
	align-items: stretch;
	overflow-x: auto;
	border-bottom: 1px solid var(--border-color);
}

.dsa-tab {
	position: relative;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 0 12px;
	border: 0;
	background: transparent;
	color: var(--text-muted);
	font-size: 13px;
	white-space: nowrap;
}

.dsa-tab + .dsa-tab::before {
	position: absolute;
	left: 0;
	width: 1px;
	height: 18px;
	background: var(--fg-hover-color);
	content: "";
}

.dsa-tab.is-active {
	color: var(--text-color);
}

.dsa-tab-icon {
	font-size: 16px;
	line-height: 1;
}

.blue {
	color: var(--text-on-blue);
}

.amber {
	color: var(--text-on-orange);
}

.green,
.dsa-code-icon {
	color: var(--text-on-green);
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
	color: var(--text-color);
	font-size: 22px;
	font-weight: 650;
}

.dsa-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 6px;
	margin-top: 14px;
}

.dsa-difficulty,
.dsa-chip {
	display: inline-flex;
	align-items: center;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--control-bg);
	color: var(--text-color);
	font-size: 11px;
	line-height: 1;
}

.dsa-difficulty {
	background: rgba(31, 169, 113, 0.15);
	color: var(--text-on-green);
	text-transform: capitalize;
}

.dsa-chip.amber {
	color: var(--text-on-orange);
}

.dsa-statement section {
	margin-top: 28px;
}

.dsa-statement h3 {
	margin: 0 0 12px;
	color: var(--text-color);
	font-size: 14px;
	font-weight: 650;
}

.dsa-rich-text {
	color: var(--text-color);
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
    color: var(--text-color);
}

.dsa-rich-text :deep(a) {
    color: var(--text-on-blue, #6ea8fe);
}

.dsa-rich-text :deep(h1),
.dsa-rich-text :deep(h2),
.dsa-rich-text :deep(h3),
.dsa-rich-text :deep(h4),
.dsa-rich-text :deep(h5),
.dsa-rich-text :deep(h6) {
    color: var(--text-color);
}

.dsa-rich-text :deep(pre) {
	padding: 12px 14px;
	border-left: 2px solid var(--border-color);
	border-radius: 0;
	background: transparent;
	color: var(--text-color);
	white-space: pre-wrap;
}

.dsa-rich-text :deep(code) {
	padding: 2px 5px;
	border: 1px solid var(--border-color);
	border-radius: 5px;
	background: var(--control-bg);
	color: var(--text-color);
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
	color: var(--text-muted);
	text-align: center;
}

.dsa-tab-empty h2 {
	margin: 0 0 8px;
	color: var(--text-color);
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
	color: var(--text-color);
	font-size: 18px;
}

.dsa-content-heading button {
	padding: 5px 9px;
	border: 1px solid var(--border-color);
	border-radius: 5px;
	background: var(--control-bg);
	color: var(--text-color);
	font-size: 11px;
}

.dsa-content-heading button:disabled {
	opacity: 0.5;
}

.dsa-submission-card {
	margin-bottom: 10px;
	overflow: hidden;
	border: 1px solid var(--border-color);
	border-radius: 7px;
	background: var(--card-bg);
}

.dsa-submission-card > div {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 11px 12px;
	color: var(--text-muted);
	font-size: 11px;
}

.dsa-submission-card strong {
	font-weight: 600;
}

.dsa-submission-actions {
	flex-wrap: wrap;
}

.dsa-submission-actions button {
	border: 1px solid var(--border-color);
	border-radius: 4px;
	padding: 5px 8px;
	background: var(--control-bg);
	color: var(--text-color);
	cursor: pointer;
}

.dsa-submission-actions button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
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
	color: var(--text-on-green);
}

.submission-status.wrong-answer {
	color: var(--text-on-red);
}

.submission-status.runtime-error {
	color: var(--text-on-orange);
}

.submission-status.compilation-error {
	color: var(--text-on-purple);
}

.submission-status.running,
.submission-status.queued {
	color: var(--text-on-orange);
}

.submission-status.rejected {
	color: var(--text-on-red);
}

.submission-score {
	color: var(--text-on-orange);
	font-weight: 600;
}

.dsa-submission-card time {
	margin-left: auto;
}

/* Row of stat chips (Runtime / Time Complexity / Space Complexity) shown
   below the main status row on each submission card. Sits in its own flex
   row so it can wrap independently and doesn't fight the status line for
   space. */
.dsa-submission-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 0 12px 11px;
}

.stat-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border: 1px solid var(--border-color);
	border-radius: 999px;
	background: var(--control-bg);
	color: var(--text-muted);
	font-size: 11px;
	line-height: 1.4;
}

.stat-icon {
	font-size: 11px;
	line-height: 1;
	opacity: 0.85;
}

.stat-label {
	font-weight: 600;
	color: var(--text-muted);
}

.stat-value {
	color: var(--text-color);
	font-family: var(--font-stack-monospace);
	font-weight: 600;
}

.dsa-submission-card pre {
	max-height: 280px;
	margin: 0;
	overflow: auto;
	padding: 14px;
	border-top: 1px solid var(--border-color);
	border-radius: 0;
	background: var(--control-bg);
	color: var(--text-color);
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
	background: var(--control-bg);
	content: "";
	transition: background 0.15s;
}

.dsa-resizer span {
	position: absolute;
	width: 3px;
	height: 42px;
	border-radius: 2px;
	background: var(--fg-hover-color);
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
	background: var(--bg-color);
}

.dsa-code-panel,
.dsa-terminal {
	min-height: 0;
	overflow: hidden;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
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
	border: 1px solid var(--border-color);
	border-radius: 5px;
	background: var(--card-bg);
	color: var(--text-color);
	font-family: var(--font-stack-monospace);
	font-size: 11px;
	font-weight: 600;
}

.dsa-button {
	display: inline-flex;
	height: 30px;
	align-items: center;
	gap: 6px;
	padding: 0 13px;
	border: 1px solid transparent;
	border-radius: 6px;
	color: var(--text-color);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.05s ease;
}

.dsa-button-icon {
	width: 13px;
	height: 13px;
	flex-shrink: 0;
}

.dsa-button-spinner {
	width: 12px;
	height: 12px;
	flex-shrink: 0;
	border: 2px solid currentColor;
	border-radius: 50%;
	border-top-color: transparent;
	opacity: 0.75;
	animation: dsa-button-spin 0.7s linear infinite;
}

@keyframes dsa-button-spin {
	to {
		transform: rotate(360deg);
	}
}

.dsa-button:active:not(:disabled) {
	transform: translateY(1px);
}

.dsa-button:disabled {
	cursor: not-allowed;
	opacity: 0.55;
	transform: none;
}

.dsa-run {
	border-color: var(--border-color);
	background: var(--card-bg);
	color: var(--text-color);
}

.dsa-run:hover:not(:disabled) {
	border-color: var(--border-color);
	background: var(--fg-hover-color);
}

.dsa-run:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 2px;
}

.dsa-submit {
	border-color: #1c7a43;
	color: #fff;
	background: #1e8e4d;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.dsa-submit:hover:not(:disabled) {
	border-color: #1c7a43;
	background: #24a45a;
}

.dsa-submit:active:not(:disabled) {
	background: #1b7d44;
	box-shadow: none;
}

.dsa-submit:focus-visible {
	outline: 2px solid #24a45a;
	outline-offset: 2px;
}

.dsa-editor-toolbar {
	display: flex;
	height: 38px;
	flex: 0 0 38px;
	align-items: center;
	gap: 18px;
	padding: 0 12px;
	border-top: 1px solid var(--border-color);
	border-bottom: 1px solid var(--border-color);
	color: var(--text-color);
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
	color: var(--text-color);
	font: inherit;
	cursor: pointer;
}

.dsa-language-select select:disabled {
	cursor: wait;
	opacity: 0.6;
}

.dsa-language-select select option {
	background: var(--control-bg);
	color: var(--text-color);
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
	color: var(--text-muted);
}

.dsa-lock {
	color: var(--text-muted);
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
	color: var(--text-muted);
	font-size: 10px;
}

.dsa-terminal {
	color: var(--text-color);
}

.dsa-terminal-header {
	display: flex;
	height: 42px;
	align-items: center;
	justify-content: space-between;
	padding: 0 12px;
	border-bottom: 1px solid var(--border-color);
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
	color: var(--text-muted);
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
	background: var(--fg-hover-color);
	content: "";
}

.dsa-result-tabs .is-active {
	color: var(--text-color);
}

.dsa-terminal-header button {
	border: 0;
	background: transparent;
	color: var(--text-muted);
	font-size: 11px;
}

.dsa-terminal-header button:hover {
	color: var(--text-color);
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
	color: var(--text-color);
	white-space: pre-wrap;
}

.dsa-empty-result {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	color: var(--text-muted);
	font-family: var(--font-stack);
}

.dsa-testcase-input {
	display: flex;
	min-height: 100%;
	flex-direction: column;
	gap: 10px;
}

.dsa-testcase-input label {
	color: var(--text-color);
	font-family: var(--font-stack);
	font-size: 11px;
	font-weight: 600;
}

.dsa-testcase-input textarea {
	min-height: 105px;
	resize: vertical;
	border: 1px solid var(--border-color);
	border-radius: 7px;
	outline: none;
	background: var(--control-bg);
	color: var(--text-color);
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
	color: var(--text-muted);
	font-family: var(--font-stack);
	font-size: 12px;
}

.dsa-case-tabs button:hover {
	background: var(--control-bg);
	color: var(--text-color);
}

.dsa-case-tabs button.is-active {
	background: var(--fg-hover-color);
	color: var(--text-color);
}

.dsa-case-tabs .dsa-add-case {
	padding: 0 11px;
	color: var(--text-muted);
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
	color: var(--text-on-red);
	font-size: 20px;
	font-weight: 500;
}

.dsa-result-summary strong.accepted {
	color: var(--text-on-green);
}

.dsa-result-summary strong.rejected {
	color: var(--text-on-red);
}

.dsa-result-summary strong.running,
.dsa-result-summary span {
	color: var(--text-muted);
}

.dsa-complexity-info {
	display: flex;
	flex-wrap: wrap;
	gap: 10px 24px;
	margin-bottom: 18px;
	padding: 10px 14px;
	border: 1px solid var(--border-color);
	border-radius: 7px;
	background: var(--control-bg);
	font-family: var(--font-stack);
}

.dsa-complexity-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	font-size: 12px;
}

.dsa-complexity-row label {
	margin: 0;
	color: var(--text-muted);
	font-weight: 600;
}

.dsa-complexity-row span {
	color: var(--text-color);
}

.result-cases {
	margin-bottom: 16px;
}

.case-pass {
	color: var(--text-on-green);
	font-size: 9px;
}

.case-fail {
	color: var(--text-on-red);
	font-size: 9px;
}

.dsa-result-details {
	display: grid;
	gap: 8px;
}

.dsa-result-details label {
	margin-top: 4px;
	color: var(--text-muted);
	font-size: 11px;
}

.dsa-result-details pre {
	min-height: 54px;
	padding: 12px;
	border-radius: 7px;
	background: var(--control-bg);
	color: var(--text-color);
}

.dsa-result-details pre.is-error {
	color: var(--text-on-red);
}

.dsa-muted {
	color: var(--text-muted);
}

@media (max-width: 900px) {
	.dsa-practice-view.is-standalone {
		overflow-y: auto;
	}
	.is-standalone .dsa-practice-content {
		flex: none;
	}
	.is-standalone .dsa-practice-shell {
		height: auto;
	}
	.dsa-nav-title > span,
	.dsa-nav-mark {
		display: none;
	}
	.dsa-practice-navigation {
		gap: 12px;
	}
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
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
}

.contest-progress-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	color: var(--text-color);
	font-size: 12px;
}

.contest-progress-header strong {
	color: var(--text-color);
}

.contest-progress-header span {
	color: var(--text-muted);
}

.contest-progress-header b {
	color: var(--text-on-orange);
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
	background: var(--control-bg);
}

.progress-item strong {
	font-size: 17px;
}

.progress-item span {
	color: var(--text-muted);
	font-size: 10px;
}

.progress-item.solved strong {
	color: var(--text-on-green);
}

.progress-item.attempted strong {
	color: var(--text-on-orange);
}

.progress-item.unsolved strong {
	color: var(--text-muted);
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

	.dsa-complexity-info {
		flex-direction: column;
		gap: 8px;
	}
}

.submission-status.accepted {
	color: var(--text-on-green);
}
.submission-status.wrong-answer,
.submission-status.failed {
	color: var(--text-on-red);
}
.submission-status.time-limit-exceeded {
	color: var(--text-on-orange);
}
.submission-status.compilation-error {
	color: var(--text-on-red);
}
.submission-status.runtime-error {
	color: var(--text-on-red);
}
.submission-status.running,
.submission-status.queued {
	color: var(--text-on-blue);
}
</style>

<style>
body.dsa-focus-mode {
	overflow: hidden;
}
body.dsa-focus-mode .body-sidebar-container,
body.dsa-focus-mode .main-section > header,
body.dsa-focus-mode .dsa-editor-page .page-head {
	display: none !important;
}
body.dsa-focus-mode .dsa-editor-page {
	position: fixed;
	inset: 0;
	z-index: 1030;
	margin: 0;
	padding: 0;
	width: 100%;
	background: var(--bg-color);
}
body.dsa-focus-mode .dsa-editor-page .page-body,
body.dsa-focus-mode .dsa-editor-page .layout-main,
body.dsa-focus-mode .dsa-editor-page .layout-main-section-wrapper,
body.dsa-focus-mode .dsa-editor-page .layout-main-section {
	margin: 0;
	padding: 0;
	width: 100%;
	max-width: none;
	border: 0;
}
.dsa-catalog-page .layout-main-section {
	border: 0;
	background: transparent;
}
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
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: 6px;
    font-weight: 500;
}

.complexity-result-icon {
    font-size: 0.95em;
    line-height: 1;
}

.complexity-result.optimal {
    color: #28c76f;
}

.complexity-result.too-complex {
    color: #e05757;
    font-weight: 600;
}

.complexity-result.unknown {
    color: #999;
}

.complexity-result.unknown .complexity-result-icon {
    display: none;
}
</style>