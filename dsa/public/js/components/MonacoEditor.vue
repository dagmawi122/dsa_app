<template>
	<div class="monaco-wrapper">
		<div ref="editorContainer" class="monaco-editor"></div>
	</div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const __ = window.__;
const MONACO_BASE_URL = "/assets/dsa/node_modules/monaco-editor/min/vs";
let monacoPromise;

const props = defineProps({
	modelValue: { type: String, default: "" },
	language: { type: String, default: "cpp" },
});

const emit = defineEmits(["update:modelValue"]);

const editorContainer = ref(null);

let editor = null;
let disposed = false;
let themeMediaQuery = null;
let themeChangeHandler = null;

function editorTheme() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "vs-dark"
		: "vs";
}

function loadMonaco() {
	if (window.monaco) {
		return Promise.resolve(window.monaco);
	}

	if (monacoPromise) {
		return monacoPromise;
	}

	monacoPromise = new Promise((resolve, reject) => {
		const configure = () => {
			window.require.config({
				paths: {
					vs: MONACO_BASE_URL,
				},
			});

			window.MonacoEnvironment = {
				getWorkerUrl() {
					const worker = `
						self.MonacoEnvironment={
							baseUrl:'${MONACO_BASE_URL}/'
						};
						importScripts(
							'${MONACO_BASE_URL}/base/worker/workerMain.js'
						);
					`;

					return `data:text/javascript;charset=utf-8,${encodeURIComponent(worker)}`;
				},
			};

			window.require(
				["vs/editor/editor.main"],
				() => resolve(window.monaco),
				reject
			);
		};

		if (window.require?.config) {
			configure();
			return;
		}

		const script = document.createElement("script");

		script.src = `${MONACO_BASE_URL}/loader.js`;

		script.onload = configure;

		script.onerror = () => {
			reject(
				new Error(
					__("Could not load the Monaco editor.")
				)
			);
		};

		document.head.appendChild(script);
	});

	return monacoPromise;
}

onMounted(async () => {
	try {
		const monaco = await loadMonaco();

		if (disposed || !editorContainer.value) {
			return;
		}

		editor = monaco.editor.create(editorContainer.value, {
			value: props.modelValue,
			language: props.language,

			// Follow the browser/OS color scheme.
			theme: editorTheme(),

			automaticLayout: true,

			minimap: {
				enabled: false,
			},

			fontSize: 14,
			lineNumbers: "on",
			scrollBeyondLastLine: false,

			padding: {
				top: 12,
				bottom: 12,
			},
		});

		editor.onDidChangeModelContent(() => {
			if (!editor || disposed) {
				return;
			}

			emit("update:modelValue", editor.getValue());
		});

		/*
		 * Keep Monaco synchronized with the browser/OS theme.
		 *
		 * Example:
		 * Light → vs
		 * Dark  → vs-dark
		 */
		themeMediaQuery = window.matchMedia(
			"(prefers-color-scheme: dark)"
		);

		themeChangeHandler = () => {
			if (!editor || disposed) {
				return;
			}

			monaco.editor.setTheme(editorTheme());
		};

		themeMediaQuery.addEventListener(
			"change",
			themeChangeHandler
		);
	} catch (error) {
		console.error(
			"Failed to initialize Monaco Editor:",
			error
		);
	}
});

watch(
	() => props.modelValue,
	(value) => {
		if (!editor) {
			return;
		}

		if (value !== editor.getValue()) {
			editor.setValue(value);
		}
	}
);

watch(
	() => props.language,
	(language) => {
		if (!editor?.getModel()) {
			return;
		}

		window.monaco.editor.setModelLanguage(
			editor.getModel(),
			language
		);
	}
);

function layout() {
	editor?.layout();
}

defineExpose({
	layout,
});

onBeforeUnmount(() => {
	disposed = true;

	if (themeMediaQuery && themeChangeHandler) {
		themeMediaQuery.removeEventListener(
			"change",
			themeChangeHandler
		);
	}

	themeMediaQuery = null;
	themeChangeHandler = null;

	editor?.dispose();
	editor = null;
});
</script>

<style scoped>
.monaco-wrapper,
.monaco-editor {
	width: 100%;
	height: 100%;
}

.monaco-wrapper {
	overflow: hidden;
}
</style>