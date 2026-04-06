<script setup>
import { onBeforeUnmount, watch } from 'vue';
import thankYouImage from '../assets/images/thankyou.png';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: 'សូមអរគុណ',
    },
    // message: {
    //     type: String,
    //     default: 'សូមអរគុណ за您的支付。',
    // },
    buttonText: {
        type: String,
        default: 'OK',
    },
    autoCloseMs: {
        type: Number,
        default: 5000,
    },
});

const emit = defineEmits(['close']);

let closeTimer = null;

const clearCloseTimer = () => {
    if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
    }
};

watch(
    () => props.visible,
    (isVisible) => {
        clearCloseTimer();
        if (!isVisible) return;

        closeTimer = setTimeout(() => {
            emit('close');
        }, props.autoCloseMs);
    },
);

onBeforeUnmount(() => {
    clearCloseTimer();
});
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <div class="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl">
            <img :src="thankYouImage" alt="Thank You" class="mx-auto mb-3 h-20 w-20 object-contain" />

            <h3 class="text-2xl font-bold text-slate-100">{{ title }}</h3>
            <!-- <p class="mt-2 text-slate-300">{{ message }}</p> -->

            <!-- <button type="button"
                class="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400"
                @click="emit('close')">
                {{ buttonText }}
            </button> -->
        </div>
    </div>
</template>
