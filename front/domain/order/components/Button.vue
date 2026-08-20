<script setup lang="ts">
const { menu } = defineProps<{ menu: Menu }>();

const { needsOf } = useBasketNeeds();
const { job, isQueueing, isRunning, error, order } = useGroceryOrder();

const send = async (): Promise<void> => {
  await order(menu.weekOf, needsOf(menu));
};
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.lead') }}</p>

    <button
      type="button"
      class="mt-3 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
      :disabled="isQueueing || isRunning"
      @click="send"
    >
      {{ isQueueing || isRunning ? $t('order.working') : $t('order.action') }}
    </button>

    <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ $t(error) }}</p>

    <OrderProgress v-if="job" :job="job" class="mt-4" />

    <p class="mt-3 text-xs text-muted">{{ $t('order.neverPays') }}</p>
  </section>
</template>
