<script setup lang="ts">
const { thresholdCents, isSaving, isSaved, refresh, save } = useGroceryPreference();

// Euros in the field, cents on the wire. Nobody types a threshold in cents.
const euros = ref('');

const submit = async (): Promise<void> => {
  const typed = euros.value.trim();
  await save(typed === '' ? undefined : Math.round(Number(typed) * 100));
};

watch(thresholdCents, (cents): void => {
  euros.value = cents === undefined ? '' : String(cents / 100);
});

onMounted((): void => {
  void refresh();
});
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.cost.threshold') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.cost.thresholdHint') }}</p>

    <form class="mt-3 flex items-center gap-2" @submit.prevent="submit">
      <label class="sr-only" for="threshold">{{ $t('order.cost.threshold') }}</label>
      <input
        id="threshold"
        v-model="euros"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        class="w-28 rounded-lg border border-default px-3 py-2 tabular-nums"
      />
      <span aria-hidden="true">€</span>
      <button
        type="submit"
        class="ml-auto rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
        :disabled="isSaving"
      >
        {{ $t('order.cost.save') }}
      </button>
    </form>

    <p v-if="isSaved" class="mt-2 text-sm text-muted" role="status">{{ $t('order.cost.saved') }}</p>
  </section>
</template>
