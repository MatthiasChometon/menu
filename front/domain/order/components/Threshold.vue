<script setup lang="ts">
const { thresholdCents, isSaving, isSaved, refresh, save } = useGroceryPreference();

// Euros in the field, cents on the wire. Nobody types a threshold in cents.
// A number input under v-model hands back a number, not a string, once the
// browser has parsed it — so the field's value is whichever the last write was,
// and reading it as a string would throw the moment someone actually typed.
const euros = ref<string | number>('');
const { hasFailed: loadFailed, run: runLoad } = useAttempt();
const { hasFailed: saveFailed, run: runSave } = useAttempt();

const submit = async (): Promise<void> => {
  const typed = String(euros.value).trim();
  await runSave((): Promise<void> =>
    save(typed === '' ? undefined : Math.round(Number(typed) * 100)),
  );
};

watch(thresholdCents, (cents): void => {
  euros.value = cents === undefined ? '' : String(cents / 100);
});

// Without the saved value the field would read as empty, and saving it would
// wipe the real threshold: the form is not shown until the load works.
const load = (): Promise<void> => runLoad(refresh);

onMounted(load);
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.cost.threshold') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.cost.thresholdHint') }}</p>

    <OrderLoadFailed v-if="loadFailed" :message="$t('order.loadFailed.threshold')" @retry="load" />

    <form v-else class="mt-3 flex items-center gap-2" @submit.prevent="submit">
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

    <p v-if="saveFailed" class="mt-2 text-sm text-error" role="alert">
      {{ $t('order.saveFailed') }}
    </p>
    <p v-if="isSaved" class="mt-2 text-sm text-muted" role="status">{{ $t('order.cost.saved') }}</p>
  </section>
</template>
