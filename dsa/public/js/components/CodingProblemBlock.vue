<template>
    <div ref="mountPoint" class="coding-problem-block">
        <div v-if="error" class="coding-problem-error">
            {{ error }}
        </div>

        <div v-else-if="!problem" class="coding-problem-empty">
            {{ __("No coding problem selected.") }}
        </div>
    </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const __ = (text) => text;

const props = defineProps({
    problem: {
        type: String,
        default: "",
    },
});

const mountPoint = ref(null);
const error = ref("");
let practice = null;

onMounted(async () => {
    await nextTick();

    if (!props.problem) return;

    if (!window.dsa?.mountPractice) {
        error.value = __("DSA Practice is not available.");
        return;
    }

    try {
        practice = window.dsa.mountPractice(mountPoint.value, {
            problemSlug: props.problem,
        });
    } catch (err) {
        console.error(err);
        error.value = __("Could not load the coding problem.");
    }
});

onBeforeUnmount(() => {
    practice?.unmount?.();
    practice = null;
});
</script>