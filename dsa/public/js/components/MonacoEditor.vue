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

function loadMonaco() {
	if (window.monaco) return Promise.resolve(window.monaco);
	if (monacoPromise) return monacoPromise;
	monacoPromise = new Promise((resolve, reject) => {
		const configure = () => {
			window.require.config({ paths: { vs: MONACO_BASE_URL } });
			window.MonacoEnvironment = {
				getWorkerUrl() {
					const worker = `self.MonacoEnvironment={baseUrl:'${MONACO_BASE_URL}/'};importScripts('${MONACO_BASE_URL}/base/worker/workerMain.js');`;
					return `data:text/javascript;charset=utf-8,${encodeURIComponent(worker)}`;
				},
			};
			window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
		};
		if (window.require?.config) return configure();
		const script = document.createElement("script");
		script.src = `${MONACO_BASE_URL}/loader.js`;
		script.onload = configure;
		script.onerror = () => reject(new Error(__("Could not load the Monaco editor.")));
		document.head.appendChild(script);
	});
	return monacoPromise;
}

onMounted(async () => {
	const monaco = await loadMonaco();
	editor = monaco.editor.create(editorContainer.value, {
		value: props.modelValue,
		language: props.language,
		theme: "vs-dark",
		automaticLayout: true,
		minimap: { enabled: false },
		fontSize: 14,
		lineNumbers: "on",
		scrollBeyondLastLine: false,
		padding: { top: 12, bottom: 12 },
	});
	editor.onDidChangeModelContent(() => emit("update:modelValue", editor.getValue()));
});

watch(
	() => props.modelValue,
	(value) => {
		if (editor && value !== editor.getValue()) editor.setValue(value);
	}
);

watch(
	() => props.language,
	(language) => {
		if (editor?.getModel()) window.monaco.editor.setModelLanguage(editor.getModel(), language);
	}
);

function layout() {
	editor?.layout();
}

defineExpose({ layout });

onBeforeUnmount(() => {
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
