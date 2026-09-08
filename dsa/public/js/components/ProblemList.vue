<template>
	<section class="problem-catalog" aria-labelledby="catalog-title">
		<header class="catalog-header">
			<div>
				<div class="catalog-eyebrow">
					<span class="catalog-mark">&lt;/&gt;</span>
					{{ __("DATA STRUCTURES & ALGORITHMS") }}
				</div>
				<h1 id="catalog-title">{{ __("Practice problems") }}</h1>
				<p>{{ __("Choose a topic. Find your challenge. Build a better solution.") }}</p>
			</div>
		</header>

		<div class="catalog-stats" aria-label="Problem counts">
			<div class="catalog-stat">
				<span>{{ __("Problem library") }}</span
				><strong
					>{{ allProblems.length }}<small>{{ __("problems to explore") }}</small></strong
				>
			</div>
			<div v-for="level in levels" :key="level" class="catalog-stat">
				<span
					><i :class="['difficulty-dot', level]"></i
					>{{ __(level[0].toUpperCase() + level.slice(1)) }}</span
				>
				<strong
					>{{ difficultyCount(level)
					}}<small>{{
						level === "easy"
							? __("Build your foundations")
							: level === "medium"
							? __("Put your skills to work")
							: __("Take on a challenge")
					}}</small></strong
				>
			</div>
		</div>

		<div class="catalog-surface">
			<div class="catalog-toolbar">
				<label class="catalog-search">
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
					>
						<circle cx="10.5" cy="10.5" r="6.5" />
						<path d="m16 16 4 4" />
					</svg>
					<input
						v-model="search"
						type="search"
						:placeholder="__('Search problems…')"
						:aria-label="__('Search problems')"
					/>
				</label>
				<details class="topic-picker" @keydown.esc="closeTopicPicker">
					<summary>
						{{ __("Topics") }}
						<span v-if="selectedTopics.length" class="filter-count">{{
							selectedTopics.length
						}}</span
						><span aria-hidden="true">⌄</span>
					</summary>
					<div class="topic-options">
						<p>{{ __("Match any selected topic") }}</p>
						<label v-for="topic in availableTopics" :key="topic"
							><input v-model="selectedTopics" type="checkbox" :value="topic" />{{
								topic
							}}</label
						>
						<p v-if="!availableTopics.length">{{ __("No topics assigned yet.") }}</p>
					</div>
				</details>
				<select
					v-model="difficulty"
					class="difficulty-select"
					:aria-label="__('Filter by difficulty')"
				>
					<option value="">{{ __("All difficulties") }}</option>
					<option v-for="level in levels" :key="level" :value="level">
						{{ __(level[0].toUpperCase() + level.slice(1)) }}
					</option>
				</select>
			</div>
			<div class="catalog-results-heading">
				<span role="status"
					>{{ filteredProblems.length }}
					{{ hasFilters ? __("problems matching your filters") : __("problems") }}</span
				>
				<button
					v-if="hasFilters"
					type="button"
					class="clear-filters"
					@click="clearFilters"
				>
					{{ __("Clear filters") }}
				</button>
			</div>
			<div v-if="selectedTopics.length" class="selected-topics">
				<button
					v-for="topic in selectedTopics"
					:key="topic"
					type="button"
					:aria-label="__('Remove topic') + ': ' + topic"
					@click="selectedTopics = selectedTopics.filter((item) => item !== topic)"
				>
					{{ topic }} <span aria-hidden="true">×</span>
				</button>
			</div>

			<div v-if="loading" class="catalog-empty" role="status">
				{{ __("Loading your problem library…") }}
			</div>
			<div v-else-if="error" class="catalog-empty" role="alert">
				<h2>{{ error }}</h2>
				<button type="button" class="catalog-button" @click="refresh">
					{{ __("Try again") }}
				</button>
			</div>
			<div v-else-if="!filteredProblems.length" class="catalog-empty">
				<div class="empty-icon" aria-hidden="true">&lt;/&gt;</div>
				<h2>
					{{
						allProblems.length
							? __("No matching problems")
							: __("Your problem library starts here")
					}}
				</h2>
				<p>
					{{
						allProblems.length
							? __(
									"Try another search or clear your filters to explore more problems."
							  )
							: __("Problems will appear here once they have been created.")
					}}
				</p>
				<button
					v-if="hasFilters"
					type="button"
					class="catalog-button"
					@click="clearFilters"
				>
					{{ __("Clear filters") }}
				</button>
			</div>
			<div v-else class="catalog-table-wrap">
				<table class="catalog-table">
					<thead>
						<tr>
							<th scope="col">{{ __("Problem") }}</th>
							<th scope="col">{{ __("Difficulty") }}</th>
							<th scope="col" class="topics-column">{{ __("Topics") }}</th>
							<th scope="col">
								<span class="visually-hidden">{{ __("Open problem") }}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(item, index) in filteredProblems" :key="item.name">
							<td>
								<a :href="problemUrl(item)" class="problem-title"
									><span class="problem-number">{{
										String(index + 1).padStart(2, "0")
									}}</span
									><span>{{ item.title }}</span></a
								>
							</td>
							<td>
								<span :class="['difficulty-badge', item.difficulty]"
									><i :class="['difficulty-dot', item.difficulty]"></i
									>{{
										__(
											item.difficulty[0].toUpperCase() +
												item.difficulty.slice(1)
										)
									}}</span
								>
							</td>
							<td class="topics-column">
								<div class="row-topics">
									<span v-for="topic in item.topics" :key="topic">{{
										topic
									}}</span
									><span v-if="!item.topics.length" class="untagged">{{
										__("Not tagged yet")
									}}</span>
								</div>
							</td>
							<td class="open-cell">
								<a
									:href="problemUrl(item)"
									class="open-problem"
									:aria-label="__('Solve') + ' ' + item.title"
									><span>{{ __("Solve") }}</span
									><span aria-hidden="true">↗</span></a
								>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<footer class="catalog-footer">
				<span>{{ __("One problem. Multiple approaches. Keep improving.") }}</span
				><span>{{ __("DSA Practice") }} <span aria-hidden="true">↗</span></span>
			</footer>
		</div>
	</section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";

const __ = window.__;
const loading = ref(true);
const error = ref("");
let fetching = false;
const allProblems = ref([]);
const selectedTopics = ref([]);
const search = ref("");
const difficulty = ref("");
const levels = ["easy", "medium", "hard"];
const availableTopics = computed(() =>
	[...new Set(allProblems.value.flatMap((item) => item.topics))].sort()
);
const hasFilters = computed(
	() => !!(selectedTopics.value.length || search.value || difficulty.value)
);
const filteredProblems = computed(() =>
	allProblems.value.filter(
		(item) =>
			(!selectedTopics.value.length ||
				item.topics.some((topic) => selectedTopics.value.includes(topic))) &&
			(!difficulty.value || item.difficulty === difficulty.value) &&
			item.title.toLowerCase().includes(search.value.trim().toLowerCase())
	)
);
const difficultyCount = (level) =>
	allProblems.value.filter((item) => item.difficulty === level).length;
const problemUrl = (item) => "/app/dsa-practice/" + encodeURIComponent(item.route_slug);
function applyTopicFromRoute() {
	const params = new URLSearchParams(window.location.search);
	if (!params.has("topic")) return;
	selectedTopics.value = [...new Set(params.getAll("topic").filter((topic) => topic.trim()))];
	search.value = "";
	difficulty.value = "";
	if (frappe.route_options) delete frappe.route_options.topic;
}

// Keep the URL in sync so clearing/changing a linked topic survives returning
// to this cached Desk page and opening its URL directly.
watch(
	selectedTopics,
	(topics) => {
		if (frappe.get_route()[0] !== "list-problems") return;
		const url = new URL(window.location.href);
		url.searchParams.delete("topic");
		topics.forEach((topic) => url.searchParams.append("topic", topic));
		window.history.replaceState(
			window.history.state,
			"",
			url.pathname + url.search + url.hash
		);
	},
	{ deep: true }
);

function clearFilters() {
	selectedTopics.value = [];
	search.value = "";
	difficulty.value = "";
}
function closeTopicPicker(event) {
	event.currentTarget.open = false;
	event.currentTarget.querySelector("summary").focus();
}
async function refresh() {
	applyTopicFromRoute();
	if (fetching) return;
	fetching = true;
	error.value = "";
	try {
		const response = await frappe.call({ method: "dsa.api.get_problems" });
		allProblems.value = response.message || [];
	} catch (err) {
		error.value = __("Could not load problems.");
	} finally {
		loading.value = false;
		fetching = false;
	}
}
onMounted(refresh);
defineExpose({ refresh });
</script>

<style scoped>
.problem-catalog {
	max-width: 1240px;
	margin: 0 auto;
	padding: 24px 8px 40px;
	color: var(--text-color);
}
.catalog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 24px;
	margin-bottom: 30px;
}
.catalog-eyebrow {
	display: flex;
	align-items: center;
	gap: 9px;
	color: var(--text-muted);
	font-size: 10px;
	font-weight: 650;
	letter-spacing: 1.5px;
}
.catalog-mark {
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border-radius: 8px;
	background: var(--bg-blue);
	color: var(--text-on-blue);
	font-size: 14px;
	letter-spacing: -1px;
}
.catalog-header h1 {
	margin: 14px 0 10px;
	font-size: clamp(26px, 3vw, 36px);
	font-weight: 650;
	letter-spacing: -1.2px;
	color: var(--heading-color, var(--text-color));
}
.catalog-header p {
	margin: 0;
	color: var(--text-muted);
	font-size: 14px;
}
.catalog-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 10px 14px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
	color: var(--text-color);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	text-decoration: none;
}
.catalog-button:hover {
	background: var(--fg-hover-color);
}
.catalog-stats {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	margin-bottom: 28px;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	background: var(--card-bg);
}
.catalog-stat {
	padding: 20px 24px;
}
.catalog-stat + .catalog-stat {
	border-left: 1px solid var(--border-color);
}
.catalog-stat > span {
	display: flex;
	align-items: center;
	gap: 7px;
	color: var(--text-muted);
	font-size: 12px;
}
.catalog-stat strong {
	display: block;
	margin-top: 12px;
	font-size: 28px;
	line-height: 1.1;
	font-weight: 600;
	letter-spacing: -0.8px;
}
.catalog-stat small {
	display: block;
	margin-top: 8px;
	font-size: 11px;
	letter-spacing: normal;
	font-weight: 400;
	color: var(--text-muted);
}
.difficulty-dot {
	display: inline-block;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	flex-shrink: 0;
}
.difficulty-dot.easy {
	color: var(--text-on-green);
}
.difficulty-dot.medium {
	color: var(--text-on-orange);
}
.difficulty-dot.hard {
	color: var(--text-on-red);
}
.catalog-surface {
	border: 1px solid var(--border-color);
	border-radius: 12px;
	background: var(--card-bg);
}
.catalog-toolbar {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	padding: 20px 22px 14px;
}
.catalog-search {
	display: flex;
	flex: 1;
	align-items: center;
	gap: 10px;
	min-width: 200px;
	margin: 0;
	padding: 0 12px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--control-bg);
}
.catalog-search svg {
	width: 17px;
	height: 17px;
	color: var(--text-muted);
	flex-shrink: 0;
}
.catalog-search input {
	width: 100%;
	min-width: 0;
	height: 38px;
	border: 0;
	outline: none;
	background: transparent;
	color: var(--text-color);
	font-size: 12px;
}
.catalog-search:focus-within {
	outline: 2px solid var(--primary);
	outline-offset: 2px;
}
.topic-picker {
	position: relative;
}
.topic-picker summary,
.difficulty-select {
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 40px;
	padding: 9px 12px;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--card-bg);
	color: var(--text-color);
	font-size: 12px;
	cursor: pointer;
	list-style: none;
}
.topic-picker summary::-webkit-details-marker {
	display: none;
}
.filter-count {
	background: var(--bg-blue);
	color: var(--text-on-blue);
	padding: 1px 5px;
	border-radius: 4px;
	font-size: 10px;
}
.topic-options {
	position: absolute;
	top: calc(100% + 6px);
	right: 0;
	z-index: 10;
	width: 260px;
	max-width: 80vw;
	max-height: 300px;
	overflow: auto;
	padding: 12px;
	border: 1px solid var(--border-color);
	border-radius: 10px;
	background: var(--card-bg);
	box-shadow: var(--shadow-md, 0 8px 24px #0002);
}
.topic-options p {
	margin: 4px 6px 10px;
	font-size: 11px;
	color: var(--text-muted);
}
.topic-options label {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 9px 6px;
	margin: 0;
	font-size: 12px;
	border-radius: 6px;
	cursor: pointer;
}
.topic-options label:hover {
	background: var(--control-bg);
}
.topic-options input {
	accent-color: var(--primary);
}
.catalog-results-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 22px 16px;
	font-size: 11px;
	color: var(--text-muted);
}
.clear-filters {
	border: 0;
	padding: 0;
	background: transparent;
	color: var(--text-color);
	cursor: pointer;
	font-size: 11px;
}
.selected-topics {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 0 22px 16px;
}
.selected-topics button {
	display: flex;
	gap: 10px;
	align-items: center;
	border: 0;
	border-radius: 6px;
	padding: 5px 8px;
	font-size: 11px;
	background: var(--bg-blue);
	color: var(--text-on-blue);
	cursor: pointer;
}
.catalog-table-wrap {
	overflow-x: auto;
}
.catalog-table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
}
.catalog-table th {
	padding: 11px 22px;
	font-size: 10px;
	font-weight: 500;
	letter-spacing: 0.6px;
	text-transform: uppercase;
	color: var(--text-muted);
	background: var(--control-bg);
	border-block: 1px solid var(--border-color);
}
.catalog-table td {
	padding: 20px 22px;
	border-bottom: 1px solid var(--border-color);
	font-size: 12px;
}
.catalog-table tbody tr:last-child td {
	border-bottom: 0;
}
.problem-title {
	display: flex;
	align-items: center;
	gap: 16px;
	font-weight: 550;
	font-size: 13px;
	color: var(--text-color);
	text-decoration: none;
	min-width: 130px;
}
.problem-title:hover {
	color: var(--text-color);
	text-decoration: none;
}
.problem-number {
	color: var(--text-muted);
	font-size: 11px;
	font-weight: 400;
	font-variant-numeric: tabular-nums;
}
.difficulty-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 5px;
	font-size: 10px;
	font-weight: 550;
}
.difficulty-badge.easy {
	background: var(--bg-green);
	color: var(--text-on-green);
}
.difficulty-badge.medium {
	background: var(--bg-orange);
	color: var(--text-on-orange);
}
.difficulty-badge.hard {
	background: var(--bg-red);
	color: var(--text-on-red);
}
.row-topics {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}
.row-topics span {
	padding: 4px 7px;
	border-radius: 4px;
	background: var(--control-bg);
	font-size: 10px;
	color: var(--text-muted);
	white-space: nowrap;
}
.row-topics .untagged {
	padding: 0;
	background: none;
}
.open-cell {
	text-align: right;
}
.open-problem {
	display: inline-flex;
	gap: 12px;
	align-items: center;
	color: var(--text-muted);
	text-decoration: none;
	font-size: 11px;
}
.open-problem:hover {
	color: var(--text-muted);
	text-decoration: none;
}
.open-problem span:last-child {
	font-size: 18px;
}
.catalog-footer {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 22px;
	border-top: 1px solid var(--border-color);
	font-size: 10px;
	color: var(--text-muted);
}
.catalog-empty {
	padding: 64px 24px;
	text-align: center;
	border-top: 1px solid var(--border-color);
}
.catalog-empty h2 {
	margin: 12px 0 8px;
	font-size: 18px;
	color: var(--text-color);
}
.catalog-empty p {
	font-size: 12px;
	color: var(--text-muted);
}
.empty-icon {
	font-size: 24px;
	color: var(--text-muted);
}
.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
}
a:focus-visible,
button:focus-visible,
summary:focus-visible,
select:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 3px;
}
@media (max-width: 760px) {
	.problem-catalog {
		padding: 16px 0 24px;
	}
	.catalog-header {
		gap: 18px;
	}
	.catalog-stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.catalog-stat {
		padding: 16px;
	}
	.catalog-stat:nth-child(3) {
		border-left: 0;
	}
	.catalog-stat:nth-child(n + 3) {
		border-top: 1px solid var(--border-color);
	}
	.catalog-stat small {
		font-size: 10px;
	}
	.catalog-toolbar {
		padding: 16px;
		gap: 8px;
	}
	.catalog-search {
		flex-basis: 100%;
	}
	.catalog-results-heading {
		padding-inline: 16px;
	}
	.catalog-table th,
	.catalog-table td {
		padding: 16px 12px;
	}
	.topics-column {
		display: none;
	}
	.problem-title {
		gap: 8px;
	}
	.open-problem > span:first-child {
		display: none;
	}
	.catalog-footer {
		padding: 14px 16px;
	}
	.catalog-footer > span:last-child {
		display: none;
	}
}
</style>
