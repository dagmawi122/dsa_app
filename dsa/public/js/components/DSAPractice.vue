<template>
	<div
		class="dsa-practice-view"
		:class="{ 'is-standalone': props.standalone }"
	>
		<header v-if="!props.contestMode" class="dsa-practice-navigation">
			<a href="/list-problems" class="dsa-back-button"
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
			<div class="dsa-nav-right">
				<!-- Total XP. The backend is the source of truth; this only displays it. -->
				<span
					v-if="xpLoaded"
					class="dsa-xp-chip"
					:title="__('Your total XP')"
				>
					<span class="dsa-xp-chip-label">{{ __("XP") }}</span>
					<strong>{{ xpTotal }}</strong>
				</span>
				<span class="dsa-nav-mark" aria-hidden="true">&lt;/&gt;</span>
			</div>
		</header>
		<header v-else class="dsa-practice-navigation">
			<a :href="contestBackLink" class="dsa-back-button dsa-back-button-gold"
			><svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
			>
				<path d="m10 6-6 6 6 6M4 12h16" /></svg
			>{{ __("Back to Contest") }}</a
		>
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
								<span
									v-if="!props.contestMode && problem.xp_reward > 0"
									class="dsa-chip dsa-chip-xp"
								>
									{{ problem.xp_reward }} XP
								</span>
								<span
									v-if="!props.contestMode && problem.solved"
									class="dsa-chip dsa-chip-solved"
								>
									✓ {{ __("Solved") }}
								</span>
								<details class="dsa-problem-topics">
									<summary class="dsa-chip">◇ {{ __("Topics") }}</summary>
									<div class="dsa-topic-links">
										<a
											v-for="topic in problem.topics"
											:key="topic"
											class="dsa-chip dsa-topic-link"
											:href="
												'/list-problems?topic=' +
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
										:class="statusClass(submissionStatus(submission))"
									>
										<span>{{ statusIcon(submissionStatus(submission)) }}</span>
										{{ displayStatus(submissionStatus(submission)) }}
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

									<span v-if="submission.memory" class="stat-chip">
										<span class="stat-icon" aria-hidden="true">▤</span>
										<span class="stat-label">{{ __("Memory") }}</span>
										<span class="stat-value">{{
											formatMemory(submission.memory)
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

									<div v-if="contestMode" class="dsa-timer" :class="{ 'is-frozen': submissionMade }">
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
										v-if="!props.contestMode"
										type="button"
										:class="{ 'is-active': activeResultTab === 'solution' }"
										@click="selectSolutionTab"
									>
										<svg
											class="dsa-solution-tab-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M9 3h6" />
											<path d="M10 3v4l-4.5 8.5A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5.5L14 7V3" />
											<path d="M8 14h8" />
											<path d="M9.5 17h5" />
										</svg>
										{{ __("Solution") }}
									</button>

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
								<!-- Official Solution (read-only viewer; never Monaco, never v-html) -->
								<div
									v-if="activeResultTab === 'solution'"
									class="dsa-solution-output"
								>
									<div
										v-if="solutionLoading"
										class="dsa-solution-state"
										role="status"
										aria-live="polite"
									>
										<svg
											class="dsa-solution-state-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M9 3h6" />
											<path d="M10 3v4l-4.5 8.5A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5.5L14 7V3" />
											<path d="M8 14h8" />
											<path d="M9.5 17h5" />
										</svg>
										<strong>{{ __("Opening solution…") }}</strong>
										<span>{{ __("Please wait") }}</span>
										<span class="dsa-solution-spinner" aria-hidden="true"></span>
									</div>

									<div
										v-else-if="solutionError"
										class="dsa-solution-state is-error"
										role="alert"
									>
										<strong>{{ solutionErrorTitle }}</strong>
										<p>{{ solutionError }}</p>
										<button
											v-if="solutionErrorKind !== 'unavailable'"
											type="button"
											class="dsa-solution-button"
											@click="retrySolution"
										>
											{{ __("Retry") }}
										</button>
									</div>

									<div
										v-else-if="solutionUnlocked && solutionContent"
										class="dsa-solution-viewer"
									>
										<div class="dsa-solution-header">
											<div>
												<div class="dsa-solution-title">
													<svg
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
														aria-hidden="true"
													>
														<path d="M9 3h6" />
														<path d="M10 3v4l-4.5 8.5A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5.5L14 7V3" />
														<path d="M8 14h8" />
														<path d="M9.5 17h5" />
													</svg>
													{{ __("Official Solution") }}
												</div>
												<div class="dsa-solution-subtitle">
													{{ __("Editorial implementation") }}
												</div>
											</div>

											<span class="dsa-solution-language">{{
												solutionLanguageLabel
											}}</span>
										</div>

										<div
											class="dsa-solution-code"
											tabindex="0"
											role="region"
											:aria-label="__('Official solution code')"
										><pre><code>{{ solutionContent }}</code></pre></div>
									</div>

									<div v-else class="dsa-solution-state">
										<svg
											class="dsa-solution-state-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.8"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M9 3h6" />
											<path d="M10 3v4l-4.5 8.5A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5.5L14 7V3" />
											<path d="M8 14h8" />
											<path d="M9.5 17h5" />
										</svg>
										<strong>{{
											solutionFree
												? __("Official Solution")
												: __("Official Solution is locked")
										}}</strong>
										<span v-if="!solutionFree && solutionCost > 0">
											{{ __("Unlock it once for") }} {{ solutionCost }} XP
										</span>
										<span v-else-if="solutionFree && problem.solved && !solutionUnlocked">
											{{ __("Free — you already solved this problem") }}
										</span>
										<button
											type="button"
											class="dsa-solution-button is-primary"
											@click="solutionFree ? requestSolution() : openSolutionConfirm()"
										>
											{{ solutionFree ? __("View Solution") : __("Unlock Solution") }}
										</button>
									</div>
								</div>

								<div
									v-else-if="activeResultTab === 'testcase'"
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
											<span v-if="resultMemory">
												{{ __("Memory") }}: {{ resultMemory }}
											</span>
										</div>

										<!--
											XP outcome of this submission. Everything here comes from the
											backend's `xp` object; the browser never infers it from status.
										-->
										<div
											v-if="resultXp && resultXp.awarded"
											class="dsa-xp-line is-awarded"
										>
											<strong>+{{ resultXp.gained }} XP</strong>
											<span>{{ __("Total XP") }}: {{ resultXp.total }}</span>
										</div>
										<div
											v-else-if="resultXp && resultXp.already_awarded"
											class="dsa-xp-line"
										>
											<span>{{ __("Already solved") }}</span>
										</div>
										<div
											v-else-if="resultXp && resultXp.solution_first"
											class="dsa-xp-line"
										>
											<span>{{ __("No XP awarded — the official solution was opened first") }}</span>
										</div>
										<div
											v-else-if="resultXp && resultXp.error"
											class="dsa-xp-line is-error"
										>
											<span>{{ resultXp.error }}</span>
										</div>

										<div
											v-if="resultComplexity || resultSpaceComplexity"
											class="dsa-complexity-info"
										>
											<div class="dsa-complexity-row">
												<label>{{ __("Time Complexity") }}</label>
												<span>
													<span
														class="complexity-value"
														:class="complexityResultClass(complexityResult)"
													>{{ resultComplexity || __("Unknown") }}</span>
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
													<span
														class="complexity-value"
														:class="complexityResultClass(spaceComplexityResult)"
													>{{ resultSpaceComplexity || __("Unknown") }}</span>
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

		<!--
			Small XP toast. Opened only by showXpToast(), which is only called when
			the backend reports xp.awarded === true on a final Accepted result.
			Teleported to <body> so no ancestor (overflow / transform) can clip it.
		-->
		<Teleport to="body">
			<Transition name="dsa-xp-toast">
				<div
					v-if="xpToast"
					class="dsa-xp-toast"
					role="status"
					aria-live="polite"
					@click="dismissXpToast"
				>
					<span class="dsa-xp-toast-icon" aria-hidden="true">★</span>
					<div class="dsa-xp-toast-body">
						<strong>+{{ xpToast.gained }} XP</strong>
						<span>{{ __("Total XP") }}: {{ xpToast.total }}</span>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!--
			Official Solution confirmation. Shown only for a problem the backend has
			not unlocked yet. The cost comes from problem.solution_xp_deduction; the
			backend validates and deducts the XP.
		-->
		<Teleport to="body">
			<Transition name="dsa-solution-modal-fade">
				<div
					v-if="showSolutionConfirm"
					class="dsa-solution-modal-backdrop"
					@click.self="closeSolutionConfirm"
					@keydown.esc="closeSolutionConfirm"
				>
					<div
						class="dsa-solution-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="dsa-solution-modal-title"
					>
						<div class="dsa-solution-modal-icon">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M9 3h6" />
								<path d="M10 3v4l-4.5 8.5A3.5 3.5 0 0 0 8.6 21h6.8a3.5 3.5 0 0 0 3.1-5.5L14 7V3" />
								<path d="M8 14h8" />
								<path d="M9.5 17h5" />
							</svg>
						</div>

						<h2 id="dsa-solution-modal-title">{{ __("Official Solution") }}</h2>

						<p class="dsa-solution-modal-lead">
							{{
								solutionCost > 0
									? __("Opening this solution costs")
									: __("Opening this solution is free")
							}}
						</p>

						<div v-if="solutionCost > 0" class="dsa-solution-modal-cost">
							{{ solutionCost }}<span>XP</span>
						</div>

						<p v-if="xpLoaded" class="dsa-solution-modal-balance">
							{{ __("Your current XP") }}: <strong>{{ xpTotal }}</strong>
						</p>

						<p class="dsa-solution-modal-note">
							{{
								solutionCost > 0
									? __("You only pay once for this problem.")
									: __("No XP will be spent. You can reopen it any time.")
							}}
						</p>

						<p v-if="solutionForfeitsXp" class="dsa-solution-modal-warning">
							{{ __("Opening the solution before solving this problem means solving it will not award its") }}
							{{ problem.xp_reward }} XP.
						</p>

						<div
							v-if="solutionInsufficientXp && !solutionError"
							class="dsa-solution-modal-error"
							role="alert"
						>
							<strong>{{ __("Not enough XP") }}</strong>
							<span>
								{{ __("You don't have enough XP to open this solution.") }}
								{{ __("You need") }} {{ solutionCost }} XP,
								{{ __("but you only have") }} {{ xpTotal }} XP.
							</span>
						</div>

						<div v-if="solutionError" class="dsa-solution-modal-error" role="alert">
							<strong>{{ solutionErrorTitle }}</strong>
							<span>{{ solutionError }}</span>
						</div>

						<div class="dsa-solution-modal-actions">
							<button
								ref="solutionCancelButton"
								type="button"
								class="dsa-solution-button"
								:disabled="solutionLoading"
								@click="closeSolutionConfirm"
							>
								{{ __("Cancel") }}
							</button>

							<button
								type="button"
								class="dsa-solution-button is-primary"
								:disabled="solutionLoading || solutionInsufficientXp"
								@click="confirmSolutionUnlock"
							>
								<span
									v-if="solutionLoading"
									class="dsa-solution-spinner is-small"
									aria-hidden="true"
								></span>
								{{ __("Unlock Solution") }}
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MonacoEditor from "./MonacoEditor.vue";

const elapsedTime = ref(0);
let timerInterval = null;
let disposed = false;

const __ = (text) => text;

const props = defineProps({
    page: {
        type: Object,
        default: null,
    },

    standalone: {
        type: Boolean,
        default: false,
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
const contestBackLink = computed(() =>
    props.contestName ? `/contest-page/${props.contestName}` : "/list-problems"
);
const testCases = ref([{ key: 1, input: "" }]);
const activeTestCaseIndex = ref(0);
const testResults = ref([]);
const activeResultCaseIndex = ref(0);
const overallStatus = ref("");
const resultRuntime = ref("");
const resultMemory = ref("");
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

// --- XP (display only) --------------------------------------------------
// The backend decides everything about XP. These refs only hold what the
// backend last told us:
//   xpTotal   - the user's total XP (from get_xp_summary / the `xp` object)
//   resultXp  - the `xp` object of the submission currently shown
//   xpToast   - set only when the backend says this submission earned XP
const xpTotal = ref(0);
const xpLoaded = ref(false);
const resultXp = ref(null);
const xpToast = ref(null);

const XP_TOAST_VISIBLE_MS = 4500;
let xpToastTimer = null;

// --- Official Solution --------------------------------------------------
// The backend (dsa.api.open_solution / check_solution_unlock) owns the unlock,
// the XP deduction and the solution text. These refs only hold what it told us.
const solutionUnlocked = ref(false);
const solutionLoading = ref(false);
const solutionError = ref("");
const solutionErrorKind = ref(""); // "", "xp", "unavailable" or "error"
const solutionContent = ref("");
const solutionLanguageId = ref(null); // language the loaded solution is written in
const showSolutionConfirm = ref(false);
const solutionCancelButton = ref(null);
let solutionRequestId = 0;

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

const solutionCost = computed(() => Math.max(0, Number(problem.value?.solution_xp_deduction) || 0));

// UI hint only — the backend decides. A problem the user already solved (backend
// `solved`, loaded by get_problem) or already unlocked opens without a confirmation.
const solutionFree = computed(() => solutionUnlocked.value || Boolean(problem.value?.solved));

// UI hint only: the user would have to pay and cannot afford it. The backend
// (deduct_xp) still validates, so a stale number here can never overspend.
const solutionInsufficientXp = computed(
	() =>
		xpLoaded.value &&
		!solutionFree.value &&
		solutionCost.value > 0 &&
		xpTotal.value < solutionCost.value
);

// Warn only when paying for the solution would cost the user the problem's XP reward.
const solutionForfeitsXp = computed(
	() => !props.contestMode && Number(problem.value?.xp_reward) > 0 && !solutionFree.value
);

const solutionLanguageLabel = computed(
	() =>
		languages.find((language) => language.id === solutionLanguageId.value)?.label ||
		selectedLanguage.value.label
);

const solutionErrorTitle = computed(() => {
	if (solutionErrorKind.value === "xp") return __("Not enough XP");
	if (solutionErrorKind.value === "unavailable") return __("No solution available");
	return __("Couldn't open the solution");
});

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

function hasStats(submission) {
	return Boolean(
		submission?.runtime ||
		submission?.memory ||
		submission?.time_complexity ||
		submission?.space_complexity
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

	if (normalized === "rejected" || normalized.includes("complexity exceeded")) {
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

// Returns a specific status label describing WHICH complexity was exceeded,
// or null when neither time nor space complexity was rejected. Used in place
// of the generic "Rejected" label for both run and submit.
function complexityRejectionLabel(timeResult, spaceResult) {
	const timeExceeded = timeResult === "Too Complex";
	const spaceExceeded = spaceResult === "Too Complex";

	if (timeExceeded && spaceExceeded) {
		return __("Time & Space Complexity Exceeded");
	}

	if (timeExceeded) {
		return __("Time Complexity Exceeded");
	}

	if (spaceExceeded) {
		return __("Space Complexity Exceeded");
	}

	return null;
}

// Effective status shown for a saved submission: if the time and/or space
// complexity was "Too Complex", show which one was exceeded instead of the
// raw backend status (e.g. "Wrong Answer"). Wrong Answer is then only shown
// for genuinely wrong answers.
function submissionStatus(submission) {
	return (
		complexityRejectionLabel(
			submission?.complexity_result,
			submission?.space_complexity_result
		) || submission?.status
	);
}

function formatSubmissionTime(submission) {
	return submission.submission_time || submission.creation || "—";
}

// ---------------------------------------------------------------------
// XP (display only — the backend is the source of truth)
// ---------------------------------------------------------------------

function dismissXpToast() {
	clearTimeout(xpToastTimer);
	xpToastTimer = null;
	xpToast.value = null;
}

function showXpToast(gained, total) {
	clearTimeout(xpToastTimer);
	xpToast.value = { gained, total };
	xpToastTimer = setTimeout(dismissXpToast, XP_TOAST_VISIBLE_MS);
}

// Loads the user's total XP. A failure only hides the XP chip; it never
// blocks the practice page.
async function loadXp() {
	if (props.contestMode) return;

	try {
		const summary = await call("dsa.api.get_xp_summary");
		if (disposed) return;
		xpTotal.value = Number(summary?.total_xp) || 0;
		xpLoaded.value = true;
	} catch (error) {
		console.error("Failed to load XP:", error);
	}
}

// Applies the `xp` object from a FINAL (non-pending) submission response.
// The toast is shown only when the backend says THIS submission just earned
// XP (xp.awarded). The backend reports that exactly once per award, so
// repeated polls, refreshes and re-solves can never trigger it again.
function applyXpResult(result) {
	const xp = result?.xp;

	resultXp.value = xp || null;

	// A final Accepted verdict (complexity rejections come back as "Failed") means
	// the backend now counts this problem as solved, whatever XP was awarded.
	if (result?.status === "Accepted" && problem.value) problem.value.solved = true;

	if (!xp) return;

	const total = Number(xp.total);
	if (Number.isFinite(total)) {
		xpTotal.value = total;
		xpLoaded.value = true;
	}

	if (xp.error) {
		frappe.show_alert({ message: xp.error, indicator: "orange" });
	}

	if (result.status === "Accepted" && xp.awarded && Number(xp.gained) > 0) {
		if (problem.value) problem.value.solved = true;
		showXpToast(Number(xp.gained), Number.isFinite(total) ? total : xpTotal.value);
	} else if (result.status === "Accepted" && xp.already_awarded && problem.value) {
		problem.value.solved = true;
	}
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

    if (attempt.solved) {
        clearInterval(timerInterval);
        submissionMade.value = true;
        elapsedTime.value = attempt.frozen_seconds ?? 0;
        return;
    }

    submissionMade.value = false;
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
	resultMemory.value = "";
    resultComplexity.value = "";
    resultSpaceComplexity.value = "";
    complexityResult.value = "";
    spaceComplexityResult.value = "";
    activeResultCaseIndex.value = 0;
	resultXp.value = null;
}

// ---------------------------------------------------------------------
// Official Solution
// ---------------------------------------------------------------------

// Clears only Solution state. Called whenever a problem is (re)loaded so one
// problem's solution can never remain visible on another.
function resetSolutionState() {
	solutionRequestId += 1; // invalidates any in-flight request
	solutionUnlocked.value = false;
	solutionLoading.value = false;
	solutionError.value = "";
	solutionErrorKind.value = "";
	solutionContent.value = "";
	solutionLanguageId.value = null;
	showSolutionConfirm.value = false;
}

function plainText(html) {
	return (
		new DOMParser().parseFromString(String(html || ""), "text/html").body.textContent || ""
	).trim();
}

// Turns a frappe.call failure into a clean message. Prefers the backend's own
// message and never surfaces a raw JavaScript error.
function solutionErrorMessage(error) {
	const raw = error?._server_messages || error?.responseJSON?._server_messages;

	if (raw) {
		try {
			const messages = JSON.parse(raw)
				.map((entry) => {
					try {
						return JSON.parse(entry).message;
					} catch (e) {
						return entry;
					}
				})
				.filter(Boolean);

			const text = plainText(messages.join("\n"));
			if (text) return text;
		} catch (e) {
			// fall through to the other sources
		}
	}

	if (Array.isArray(error?.messages) && error.messages.length) {
		const text = plainText(error.messages.join("\n"));
		if (text) return text;
	}

	if (!(error instanceof Error) && typeof error?.message === "string" && error.message) {
		const text = plainText(error.message);
		if (text) return text;
	}

	return __("Could not open the solution. Please check your connection and try again.");
}

function solutionUnavailableMessage(languageId) {
	const label = languages.find((language) => language.id === languageId)?.label || "";
	return `${__("No official solution is available for")} ${label}.`;
}

// Asks the backend whether this user already unlocked this problem (no code
// is returned). A failure just leaves the problem "locked" in the UI; the
// backend still never charges twice.
async function checkSolutionUnlock(problemName) {
	if (props.contestMode || !problemName) return;

	try {
		const result = await call("dsa.api.check_solution_unlock", { problem: problemName });

		if (disposed || problem.value?.name !== problemName) return;

		solutionUnlocked.value = Boolean(result?.unlocked);

		// The user clicked Solution before this answer arrived.
		if (
			solutionUnlocked.value &&
			activeResultTab.value === "solution" &&
			!solutionLoading.value &&
			!solutionContent.value
		) {
			showSolutionConfirm.value = false;
			requestSolution();
		}
	} catch (error) {
		console.error("Failed to check solution unlock:", error);
	}
}

function openSolutionConfirm() {
	solutionError.value = "";
	solutionErrorKind.value = "";
	showSolutionConfirm.value = true;
}

function closeSolutionConfirm() {
	if (solutionLoading.value) return;

	showSolutionConfirm.value = false;
	solutionError.value = "";
	solutionErrorKind.value = "";
}

function confirmSolutionUnlock() {
	if (solutionLoading.value || solutionInsufficientXp.value) return;

	requestSolution();
}

function retrySolution() {
	if (solutionFree.value) {
		requestSolution();
	} else {
		openSolutionConfirm();
	}
}

function selectSolutionTab() {
	activeResultTab.value = "solution";

	if (solutionLoading.value) return;

	// Not solved and not unlocked: ask for confirmation before spending XP.
	// Solved or already unlocked: no modal — the backend returns it for free.
	if (!solutionFree.value) {
		openSolutionConfirm();
		return;
	}

	if (solutionContent.value && solutionLanguageId.value === selectedLanguageId.value) {
		solutionError.value = "";
		solutionErrorKind.value = "";
		return;
	}

	requestSolution();
}

// The ONLY place that talks to dsa.api.open_solution. The backend validates the
// XP, deducts it once per user + problem and returns the language's solution.
async function requestSolution() {
	if (!problem.value || props.contestMode) return;

	const problemName = problem.value.name;
	const languageId = selectedLanguageId.value;
	const requestId = ++solutionRequestId;

	solutionLoading.value = true;
	solutionError.value = "";
	solutionErrorKind.value = "";

	try {
		const result = await call(
			"dsa.api.open_solution",
			{ problem: problemName, language_id: languageId },
			"POST"
		);

		if (disposed || requestId !== solutionRequestId) return;

		if (!result || typeof result.solution !== "string" || !result.solution.trim()) {
			showSolutionConfirm.value = false;
			solutionErrorKind.value = "unavailable";
			solutionError.value = solutionUnavailableMessage(languageId);
			return;
		}

		solutionContent.value = result.solution;
		solutionLanguageId.value = Number(result.language_id) || languageId;
		solutionUnlocked.value = true;
		if (result.solved && problem.value) problem.value.solved = true;
		showSolutionConfirm.value = false;
		activeResultTab.value = "solution";

		// Display only: the backend already deducted the XP.
		const remaining = Number(result.remaining_xp);
		if (result.remaining_xp !== null && result.remaining_xp !== undefined && Number.isFinite(remaining)) {
			xpTotal.value = remaining;
			xpLoaded.value = true;
		}

		// The language was changed while this request was in flight.
		if (selectedLanguageId.value !== languageId) {
			requestSolution();
		}
	} catch (error) {
		if (disposed || requestId !== solutionRequestId) return;

		const message = solutionErrorMessage(error);
		let kind = "error";

		if (/no official solution|unsupported programming language|not supported/i.test(message)) {
			kind = "unavailable";
		} else if (/\bxp\b/i.test(message)) {
			kind = "xp";
		}

		solutionErrorKind.value = kind;

		if (kind === "unavailable") {
			showSolutionConfirm.value = false;
			solutionError.value = solutionUnavailableMessage(languageId);
		} else {
			solutionError.value = message;
		}
	} finally {
		if (requestId === solutionRequestId) {
			solutionLoading.value = false;
		}
	}
}

// Unlock is per user + problem, not per language: after a language change the
// solution for the new language is requested (the backend charges 0 XP).
watch(selectedLanguageId, () => {
	if (props.contestMode || solutionLoading.value) return;

	solutionError.value = "";
	solutionErrorKind.value = "";

	if (activeResultTab.value === "solution" && solutionFree.value && problem.value) {
		requestSolution();
	}
});

watch(showSolutionConfirm, (isOpen) => {
	if (isOpen) {
		nextTick(() => solutionCancelButton.value?.focus());
	}
});

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
			submissions.value = await call("dsa.api.get_contest_submissions", {
				contest: props.contestName,
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

	// Official Solution: never carry one problem's solution into another.
	// Not awaited — the unlock check must never delay or break problem loading.
	resetSolutionState();
	checkSolutionUnlock(problem.value.name);

	if (props.contestMode) {
		await loadContestProgress();
	}
}

onMounted(async () => {
	if (window.dsaTheme) window.dsaTheme.init({ hideToggle: true });
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

		// Not awaited: the XP chip must never delay or break the page.
		loadXp();
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

				const complexityLabel = complexityRejectionLabel(
					complexityResult.value,
					spaceComplexityResult.value
				);

				overallStatus.value =
					complexityLabel || result.status || __("Finished");

				resultRuntime.value = result.time
					? formatRuntime(result.time)
					: "";
				resultMemory.value = result.memory
					? formatMemory(result.memory)
					: "";
				testResults.value = [
					{
						index: activeTestCaseIndex.value + 1,
						status: complexityLabel || result.status,
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
				contest: props.contestName,
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
            // Practice submissions are polled with POST: the backend may write
            // (verdict + XP award), and Frappe only commits writes on POST.
            // Contest polling is unchanged.
            const result = props.contestMode
                ? await call("dsa.api.get_contest_submission_result", {
                      submission: queued.contest_submission,
                  })
                : await call(
                      "dsa.api.get_submission_result",
                      { submission: queued.submission },
                      "POST"
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

            // A submission is flagged the moment either complexity metric
            // comes back "Too Complex" — this overrides the raw judge
            // status (which may otherwise say "Accepted" purely on
            // correctness) the same way runCode() already does for a
            // single test run. The status names which complexity was
            // exceeded (time, space, or both).
            const complexityRejected = isComplexityRejected(
                complexityResult.value,
                spaceComplexityResult.value
            );

            const complexityLabel = complexityRejectionLabel(
                complexityResult.value,
                spaceComplexityResult.value
            );

            overallStatus.value =
                complexityLabel ||
                result.display_status ||
                result.status ||
                __("Finished");

            resultRuntime.value = result.runtime
                ? formatRuntime(result.runtime)
                : resultRuntime.value;

			resultMemory.value = result.memory
				? formatMemory(result.memory)
				: resultMemory.value;

            testResults.value = (result.results || []).map((testResult) =>
                complexityLabel
                    ? { ...testResult, status: complexityLabel }
                    : testResult
            );

            if (!result.pending) {
                // Final response only. XP is displayed exactly as the backend
                // reported it; practice mode only (contest scoring is separate).
                if (!props.contestMode) {
                    applyXpResult(result);
                }

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

    const contestName = props.contestName;

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
    if (!props.contestMode && problem.value) {
        if (props.page?.set_title) {
            props.page.set_title(
                `${__("DSA Practice")} / ${problem.value.title}`
            );
        } else {
            document.title = `DSA Practice / ${problem.value.title}`;
        }
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
	clearTimeout(xpToastTimer);
});
function formatMemory(memory) {
	const kb = Number(memory);

	if (!Number.isFinite(kb) || kb < 0) {
		return null;
	}

	if (kb === 0) {
		return "0 KB";
	}

	if (kb < 1024) {
		return `${Math.round(kb)} KB`;
	}

	const mb = kb / 1024;

	if (mb < 1024) {
		return `${mb.toFixed(2)} MB`;
	}

	const gb = mb / 1024;
	return `${gb.toFixed(2)} GB`;
}
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
.dsa-back-button-gold {
    border-color: #caa000;
    background: rgba(202, 160, 0, 0.1);
    color: #b8860b;
}
.dsa-back-button-gold:hover {
    background: rgba(202, 160, 0, 0.18);
    border-color: #caa000;
    color: #96700a;
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
.dsa-nav-right {
	display: flex;
	align-items: center;
	gap: 14px;
	margin-left: auto;
}
.dsa-nav-mark {
	color: var(--text-muted);
	font-size: 18px;
}
.dsa-xp-chip {
	display: inline-flex;
	align-items: baseline;
	gap: 6px;
	padding: 5px 11px;
	border: 1px solid var(--border-color);
	border-radius: 999px;
	background: var(--card-bg);
	font-size: 12px;
	line-height: 1.2;
}
.dsa-xp-chip-label {
	color: var(--text-muted);
	font-weight: 600;
	letter-spacing: 0.04em;
}
.dsa-xp-chip strong {
	color: var(--text-on-orange);
	font-variant-numeric: tabular-nums;
	font-weight: 700;
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

.dsa-chip-xp {
	color: var(--text-on-orange);
	font-variant-numeric: tabular-nums;
	font-weight: 600;
}

.dsa-chip-solved {
	color: var(--text-on-green);
	font-weight: 600;
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

/* NOTE: status colors live in the global <style> block below
   (single definition — see the header comment there). Nothing
   here anymore; keeping .submission-status itself since it's
   layout, not color. */

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

/* XP outcome line shown under the verdict. */
.dsa-xp-line {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 12px;
	margin: -8px 0 16px;
	color: var(--text-muted);
	font-size: 12px;
}

.dsa-xp-line strong {
	color: var(--text-on-orange);
	font-size: 14px;
	font-weight: 700;
}

.dsa-xp-line.is-error {
	color: var(--text-on-orange);
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

.dsa-complexity-row > span {
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

/* ============================================================
   XP TOAST
   Small, non-blocking card in the bottom-right corner. Colors come from
   the existing theme variables so it follows light/dark automatically.
   ============================================================ */

.dsa-xp-toast {
	position: fixed;
	right: 20px;
	bottom: 20px;
	z-index: 2000;
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 190px;
	padding: 12px 16px;
	border: 1px solid var(--border-color, #3a3a3a);
	border-left: 3px solid var(--text-on-orange, #f5b84b);
	border-radius: 10px;
	background: var(--card-bg, #1e1e1e);
	color: var(--text-color, #e6e6e6);
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
	cursor: pointer;
}

.dsa-xp-toast-icon {
	color: var(--text-on-orange, #f5b84b);
	font-size: 20px;
	line-height: 1;
}

.dsa-xp-toast-body {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.dsa-xp-toast-body strong {
	color: var(--text-on-orange, #f5b84b);
	font-size: 17px;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	line-height: 1.2;
}

.dsa-xp-toast-body span {
	color: var(--text-muted, #999);
	font-size: 12px;
}

.dsa-xp-toast-enter-active,
.dsa-xp-toast-leave-active {
	transition:
		opacity 0.25s ease,
		transform 0.25s ease;
}

.dsa-xp-toast-enter-from,
.dsa-xp-toast-leave-to {
	opacity: 0;
	transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
	.dsa-xp-toast-enter-active,
	.dsa-xp-toast-leave-active {
		transition: none;
	}
}

@media (max-width: 480px) {
	.dsa-xp-toast {
		right: 12px;
		bottom: 12px;
		left: 12px;
	}
}

/* ============================================================
   OFFICIAL SOLUTION
   Solution-specific styles only. Colors come from the existing theme
   variables, so light/dark follow the rest of the page.
   ============================================================ */

/* Tab icon: inherits the tab color, turns blue when the tab is active. */
.dsa-solution-tab-icon {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	color: inherit;
}

.dsa-result-tabs > button.is-active .dsa-solution-tab-icon {
	color: var(--text-on-blue);
}

/* Terminal content */
.dsa-solution-output {
	display: flex;
	height: 100%;
	min-height: 120px;
	flex-direction: column;
	font-family: var(--font-stack);
}

.dsa-solution-viewer {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--control-bg);
}

.dsa-solution-header {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 9px 14px;
	border-bottom: 1px solid var(--border-color);
	background: var(--card-bg);
}

.dsa-solution-title {
	display: flex;
	align-items: center;
	gap: 7px;
	color: var(--text-color);
	font-size: 13px;
	font-weight: 600;
}

.dsa-solution-title svg {
	width: 15px;
	height: 15px;
	flex-shrink: 0;
	color: var(--text-on-blue);
}

.dsa-solution-subtitle {
	margin: 2px 0 0 22px;
	color: var(--text-muted);
	font-size: 11px;
}

.dsa-solution-language {
	padding: 3px 10px;
	border: 1px solid var(--border-color);
	border-radius: 999px;
	background: var(--control-bg);
	color: var(--text-on-blue);
	font-size: 11px;
	font-weight: 600;
	white-space: nowrap;
}

.dsa-solution-code {
	min-height: 0;
	flex: 1;
	overflow: auto;
	outline: none;
}

.dsa-solution-code:focus-visible {
	box-shadow: inset 0 0 0 2px var(--primary);
}

.dsa-solution-output .dsa-solution-code pre {
	min-width: max-content;
	margin: 0;
	padding: 14px 16px;
	overflow: visible;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: var(--text-color);
	font-family: var(--font-stack-monospace);
	font-size: 12.5px;
	line-height: 1.65;
	tab-size: 4;
	white-space: pre;
}

.dsa-solution-output .dsa-solution-code code {
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
	white-space: inherit;
}

/* Loading / error / locked states */
.dsa-solution-state {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 12px;
	color: var(--text-muted);
	font-size: 12px;
	text-align: center;
}

.dsa-solution-state strong {
	color: var(--text-color);
	font-size: 13px;
	font-weight: 600;
}

.dsa-solution-state p {
	max-width: 380px;
	margin: 0;
	line-height: 1.5;
}

.dsa-solution-state-icon {
	width: 26px;
	height: 26px;
	color: var(--text-on-blue);
}

.dsa-solution-state.is-error strong {
	color: var(--text-on-red);
}

.dsa-solution-spinner {
	display: inline-block;
	width: 22px;
	height: 22px;
	flex-shrink: 0;
	margin-top: 6px;
	border: 2px solid var(--border-color);
	border-top-color: var(--text-on-blue);
	border-radius: 50%;
	animation: dsa-solution-spin 0.8s linear infinite;
}

.dsa-solution-spinner.is-small {
	width: 12px;
	height: 12px;
	margin-top: 0;
	border-color: currentColor;
	border-top-color: transparent;
	opacity: 0.8;
}

@keyframes dsa-solution-spin {
	to {
		transform: rotate(360deg);
	}
}

/* Buttons (panel + modal) */
.dsa-solution-button {
	display: inline-flex;
	height: 32px;
	align-items: center;
	justify-content: center;
	gap: 7px;
	margin-top: 6px;
	padding: 0 16px;
	border: 1px solid var(--border-color);
	border-radius: 7px;
	background: var(--control-bg);
	color: var(--text-color);
	font-family: var(--font-stack);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
}

.dsa-solution-button:hover:not(:disabled) {
	background: var(--fg-hover-color);
}

.dsa-solution-button:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 2px;
}

.dsa-solution-button:disabled {
	cursor: not-allowed;
	opacity: 0.55;
}

.dsa-solution-button.is-primary {
	border-color: #2a62c4;
	background: #2f6fe4;
	color: #fff;
}

.dsa-solution-button.is-primary:hover:not(:disabled) {
	background: #3b7bf0;
}

/* Confirmation modal */
.dsa-solution-modal-backdrop {
	position: fixed;
	inset: 0;
	z-index: 2100;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	background: rgba(0, 0, 0, 0.55);
}

.dsa-solution-modal {
	display: flex;
	width: min(400px, 100%);
	flex-direction: column;
	align-items: center;
	padding: 28px 28px 22px;
	border: 1px solid var(--border-color);
	border-radius: 14px;
	background: var(--card-bg);
	box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
	color: var(--text-color);
	font-family: var(--font-stack);
	text-align: center;
}

.dsa-solution-modal-icon {
	display: grid;
	width: 56px;
	height: 56px;
	place-items: center;
	margin-bottom: 14px;
	border-radius: 50%;
	background: rgba(75, 139, 245, 0.14);
	color: var(--text-on-blue);
}

.dsa-solution-modal-icon svg {
	width: 28px;
	height: 28px;
}

.dsa-solution-modal h2 {
	margin: 0 0 14px;
	color: var(--text-color);
	font-size: 18px;
	font-weight: 650;
}

.dsa-solution-modal-lead {
	margin: 0;
	color: var(--text-muted);
	font-size: 13px;
}

.dsa-solution-modal-cost {
	margin: 2px 0 8px;
	color: var(--text-on-orange);
	font-size: 40px;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	line-height: 1.2;
}

.dsa-solution-modal-cost span {
	margin-left: 6px;
	font-size: 18px;
	font-weight: 600;
}

.dsa-solution-modal-balance {
	margin: 0 0 10px;
	color: var(--text-muted);
	font-size: 12px;
}

.dsa-solution-modal-balance strong {
	color: var(--text-color);
	font-variant-numeric: tabular-nums;
}

.dsa-solution-modal-note {
	max-width: 300px;
	margin: 0 0 4px;
	color: var(--text-muted);
	font-size: 12px;
	line-height: 1.5;
}

.dsa-solution-modal-warning {
	max-width: 320px;
	margin: 8px 0 0;
	color: var(--text-on-orange);
	font-size: 12px;
	line-height: 1.5;
}

.dsa-solution-modal-error {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: 3px;
	margin-top: 12px;
	padding: 10px 12px;
	border: 1px solid var(--text-on-red);
	border-radius: 8px;
	background: rgba(220, 38, 38, 0.08);
	font-size: 12px;
	line-height: 1.45;
	text-align: left;
}

.dsa-solution-modal-error strong {
	color: var(--text-on-red);
}

.dsa-solution-modal-actions {
	display: flex;
	width: 100%;
	justify-content: center;
	gap: 10px;
	margin-top: 16px;
}

.dsa-solution-modal-actions .dsa-solution-button {
	min-width: 120px;
	margin-top: 0;
}

.dsa-solution-modal-fade-enter-active,
.dsa-solution-modal-fade-leave-active {
	transition: opacity 0.18s ease;
}

.dsa-solution-modal-fade-enter-from,
.dsa-solution-modal-fade-leave-to {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.dsa-solution-modal-fade-enter-active,
	.dsa-solution-modal-fade-leave-active {
		transition: none;
	}

	.dsa-solution-spinner {
		animation-duration: 2s;
	}
}
</style>
<style>
/* ============================================================
   DSA PRACTICE — GLOBAL LAYOUT
   ============================================================ */

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


/* ============================================================
   LIGHT THEME
   ============================================================ */

body.dsa-focus-mode,
body.dsa-page-mode,
body.dsa-standalone-website,
body.dsa-focus-mode[data-theme="light"],
body.dsa-page-mode[data-theme="light"],
body.dsa-standalone-website[data-theme="light"] {
    color-scheme: light;

    --bg-color: #ffffff;
    --card-bg: #ffffff;
    --control-bg: #f5f5f5;
    --fg-hover-color: #eeeeee;
    --border-color: #d9d9d9;

    --text-color: #222222;
    --text-muted: #777777;

    --text-on-blue: #2563eb;
    --text-on-green: #16a34a;
    --text-on-red: #dc2626;
    --text-on-orange: #d97706;
    --text-on-purple: #7c3aed;

    --color-optimal: #28c76f;
    --color-too-complex: #e05757;

    background: var(--bg-color);
    color: var(--text-color);
}


/* ============================================================
   DARK THEME

   IMPORTANT:
   This is controlled ONLY by data-theme.
   There is deliberately NO prefers-color-scheme rule.
   ============================================================ */

body.dsa-focus-mode[data-theme="dark"],
body.dsa-page-mode[data-theme="dark"],
body.dsa-standalone-website[data-theme="dark"] {
    color-scheme: dark;

    --bg-color: #161616;
    --card-bg: #1e1e1e;
    --control-bg: #252525;
    --fg-hover-color: #303030;
    --border-color: #3a3a3a;

    --text-color: #e6e6e6;
    --text-muted: #999999;

    --text-on-blue: #6ea8fe;
    --text-on-green: #5fd68a;
    --text-on-red: #ff6b6b;
    --text-on-orange: #f5b84b;
    --text-on-purple: #b78cff;
}


/* ============================================================
   FORCE THE PRACTICE ROOT TO FOLLOW THE VARIABLES
   ============================================================ */

body.dsa-focus-mode .dsa-practice-view,
body.dsa-page-mode .dsa-practice-view,
body.dsa-standalone-website .dsa-practice-view {
    background: var(--bg-color) !important;
    color: var(--text-color) !important;
}


/* ============================================================
   FORCE THE OUTER FRAPPE PAGE TO FOLLOW THE DSA THEME
   ============================================================ */

body.dsa-standalone-website #page-index,
body.dsa-standalone-website .page-content-wrapper,
body.dsa-standalone-website main.container,
body.dsa-standalone-website .page_content,
body.dsa-standalone-website .container {
    background: var(--bg-color) !important;
    color: var(--text-color) !important;
}


/* ============================================================
   SUBMISSION STATUS
   ============================================================ */

.submission-status.accepted {
    color: var(--text-on-green);
}

.submission-status.wrong-answer,
.submission-status.failed,
.submission-status.runtime-error,
.submission-status.rejected {
    color: var(--text-on-red);
}

.submission-status[class*="complexity-exceeded"] {
    color: var(--text-on-red);
}

.submission-status.compilation-error {
    color: var(--text-on-purple);
}

.submission-status.time-limit-exceeded,
.submission-status.running,
.submission-status.queued {
    color: var(--text-on-orange);
}


/* ============================================================
   COMPLEXITY
   ============================================================ */

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

.complexity-result.optimal,
.complexity-value.optimal {
    color: var(--color-optimal);
}

.complexity-result.too-complex,
.complexity-value.too-complex {
    color: var(--color-too-complex);
    font-weight: 600;
}

.complexity-result.unknown,
.complexity-value.unknown {
    color: var(--text-color);
}

.complexity-result.unknown .complexity-result-icon {
    display: none;
}

.complexity-value {
    font-weight: 600;
    font-family: var(--font-stack-monospace);
}

.dsa-complexity-row span {
    color: var(--text-color);
}

.dsa-timer.is-frozen {
    border-color: var(--text-on-green);
    color: var(--text-on-green);
}


/* ============================================================
   FINAL THEME OVERRIDE

   This MUST remain at the bottom.
   ============================================================ */

body.dsa-standalone-website[data-theme="light"],
body.dsa-practice-website[data-theme="light"],
body.dsa-page-mode[data-theme="light"],
body.dsa-focus-mode[data-theme="light"] {
    --bg-color: #ffffff !important;
    --card-bg: #ffffff !important;
    --control-bg: #f5f5f5 !important;
    --fg-hover-color: #eeeeee !important;
    --border-color: #d9d9d9 !important;
    --text-color: #222222 !important;
    --text-muted: #777777 !important;
}

body.dsa-standalone-website[data-theme="dark"],
body.dsa-practice-website[data-theme="dark"],
body.dsa-page-mode[data-theme="dark"],
body.dsa-focus-mode[data-theme="dark"] {
    --bg-color: #161616 !important;
    --card-bg: #1e1e1e !important;
    --control-bg: #252525 !important;
    --fg-hover-color: #303030 !important;
    --border-color: #3a3a3a !important;
    --text-color: #e6e6e6 !important;
    --text-muted: #999999 !important;
}
</style>