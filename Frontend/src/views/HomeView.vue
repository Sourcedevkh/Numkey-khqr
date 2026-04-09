<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { storeToRefs } from 'pinia';

import BaseModal from '../components/BaseModal.vue';
import IsLoading from '../components/UI/isLoading.vue';
import { useAbaKhqrStore } from '../stores/abakhqr';

const store = useAbaKhqrStore();
const { enteredCode, selectedProduct, qrData, loading, error, showSuccessModal, checkingPayment, qrTimeRemaining } = storeToRefs(store);

const formattedQrTime = computed(() => {
  const s = qrTimeRemaining.value;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
});

const onKeyDown = (event) => {
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    store.appendCode(event.key);
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    store.backspaceCode();
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    store.clearCode();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    store.submitCode();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  store.stopPaymentPolling();
});
</script>

<template>
  <div class="min-h-screen">
    <IsLoading :visible="loading" text="Generating QR code..." />
    <BaseModal :visible="showSuccessModal" title="សូមអរគុណ"
      button-text="Close" @close="store.closeSuccessModal" />

    <main class="flex  items-center justify-center p-4 text-slate-100">
      <section
        class="grid w-full max-w-md gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 text-center shadow-lg">
        <h1 class="text-3xl font-bold">Eroxi Vending Machine</h1>
        <p class="text-sm text-slate-400">Type 2-digit code by keyboard, QR will generate automatically.</p>

        <div class="grid">
          <input
            class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center text-xl text-slate-100 outline-none"
            :value="enteredCode" readonly placeholder="Enter code" />
        </div>

        <p v-if="error" class="font-semibold text-red-400">{{ error }}</p>
        <div v-if="qrData && checkingPayment" class="flex items-center justify-between gap-2 text-sm font-medium">
          <p>QR expires in</p>

          <div class="flex items-center gap-2">
            <span class="h-4 w-4 animate-spin rounded-full border-2" :class="qrTimeRemaining <= 30
              ? 'border-red-400/40 border-t-red-400'
              : 'border-emerald-500/40 border-t-emerald-500'"></span>

            <span :class="qrTimeRemaining <= 30 ? 'text-red-400 font-bold' : 'text-teal-300'">
              {{ formattedQrTime }}
            </span>
          </div>
        </div>

        <div v-if="qrData && selectedProduct"
          class="grid justify-items-center gap-1 rounded-lg border border-slate-700 p-3">
          <!-- <h2 class="text-2xl font-semibold">{{ selectedProduct.product }}</h2> -->
          <img v-if="qrData.qrImage" :src="qrData.qrImage" alt="ABA KHQR" class="mt-2 w-56 max-w-full" />
        </div>

      </section>
    </main>
  </div>
</template>
