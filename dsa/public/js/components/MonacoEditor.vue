<template>
	<div class="monaco-wrapper">
		<div ref="editorContainer" class="monaco-editor"></div>
	</div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const __ = window.__;
const MONACO_BASE_URL =
	"/assets/dsa/node_modules/monaco-editor/min/vs";

let monacoPromise;

const props = defineProps({
	modelValue: {
		type: String,
		default: "",
	},
	language: {
		type: String,
		default: "cpp",
	},
});

const emit = defineEmits(["update:modelValue"]);

const editorContainer = ref(null);

let editor = null;
let disposed = false;
let themeChangeHandler = null;



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
						self.MonacoEnvironment = {
							baseUrl: '${MONACO_BASE_URL}/'
						};

						importScripts(
							'${MONACO_BASE_URL}/base/worker/workerMain.js'
						);
					`;

					return `data:text/javascript;charset=utf-8,${encodeURIComponent(
						worker
					)}`;
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



function getDsaTheme() {
	return (
		document.body.getAttribute("data-theme") ||
		window.dsaTheme?.get?.() ||
		"light"
	);
}

function getMonacoTheme() {
	return getDsaTheme() === "dark"
		? "vs-dark"
		: "vs";
}

function applyMonacoTheme(monaco) {
	if (!monaco?.editor || !editor || disposed) {
		return;
	}

	monaco.editor.setTheme(getMonacoTheme());
}




onMounted(async () => {
	try {
		const monaco = await loadMonaco();

		if (disposed || !editorContainer.value) {
			return;
		}

		editor = monaco.editor.create(
			editorContainer.value,
			{
				value: props.modelValue,
				language: props.language,

				/*
				 * Monaco follows the DSA theme,
				 * NOT the browser/OS theme.
				 */
				theme: getMonacoTheme(),

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
			}
		);

		editor.onDidChangeModelContent(() => {
			if (!editor || disposed) {
				return;
			}

			emit(
				"update:modelValue",
				editor.getValue()
			);
		});

		themeChangeHandler = (event) => {
			if (!editor || disposed) {
				return;
			}

			const theme =
				event.detail?.theme ||
				getDsaTheme();

			monaco.editor.setTheme(
				theme === "dark"
					? "vs-dark"
					: "vs"
			);
		};

		window.addEventListener(
			"dsa-theme-change",
			themeChangeHandler
		);

		/*
		 * Apply the current theme once more after the
		 * editor has finished initializing.
		 */
		applyMonacoTheme(monaco);
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

function setTheme(theme) {
	if (!window.monaco?.editor || !editor || disposed) {
		return;
	}

	window.monaco.editor.setTheme(
		theme === "dark"
			? "vs-dark"
			: "vs"
	);
}

defineExpose({
	layout,
	setTheme,
});



onBeforeUnmount(() => {
	disposed = true;

	if (themeChangeHandler) {
		window.removeEventListener(
			"dsa-theme-change",
			themeChangeHandler
		);
	}

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