<script setup lang="ts">
// Quick daily logging: one weight, defaulted to today, saved without leaving
// the page. Reused for the very first entry too — the empty state points at
// this same form rather than opening a second one just for it.
const { defaultKg, focusToken = 0 } = defineProps<{
  defaultKg?: number;
  /** Bumped by a parent to pull focus onto this form — the empty state's own
   *  call to action, since there is nothing else on the page to focus yet. */
  focusToken?: number;
}>();
const emit = defineEmits<{ saved: [] }>();

const { add, errorOf, todayDate, bounds } = useWeightLog();

const date = ref(todayDate);
const kg = ref<number | undefined>(defaultKg);
const error = ref<string>();
const isSaving = ref(false);
const saveFailed = ref(false);
const justSaved = ref(false);
const root = useTemplateRef<HTMLElement>('root');

const JUST_SAVED_MS = 1500;
const savedTimer = ref<ReturnType<typeof setTimeout>>();
onScopeDispose((): void => clearTimeout(savedTimer.value));

watch(
  () => focusToken,
  (): void => {
    if (focusToken === 0) return;

    nextTick((): void => {
      root.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      root.value?.querySelector('input')?.focus();
    });
  },
);

const submit = async (): Promise<void> => {
  const draft = { date: date.value, kg: kg.value ?? Number.NaN };
  const validation = errorOf(draft);
  error.value = validation;
  if (validation !== undefined) return;

  isSaving.value = true;
  saveFailed.value = false;
  try {
    await add(draft);
  } catch {
    saveFailed.value = true;
    return;
  } finally {
    isSaving.value = false;
  }

  date.value = todayDate;

  justSaved.value = true;
  clearTimeout(savedTimer.value);
  savedTimer.value = setTimeout((): void => {
    justSaved.value = false;
  }, JUST_SAVED_MS);

  emit('saved');
};
</script>

<template>
  <div ref="root" class="rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-4 text-lg font-semibold">{{ $t('weight.log.addTitle') }}</h2>

    <div class="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <UFormField :label="$t('weight.log.kgLabel')">
        <UInput
          v-model.number="kg"
          type="number"
          inputmode="decimal"
          step="0.1"
          :min="bounds.minKg"
          :max="bounds.maxKg"
          size="xl"
          @keyup.enter="submit"
        >
          <template #trailing>
            <span class="text-sm text-muted">{{ $t('weight.log.kgUnit') }}</span>
          </template>
        </UInput>
      </UFormField>

      <UFormField :label="$t('weight.log.dateLabel')">
        <UInput v-model="date" type="date" :max="todayDate" size="xl" @keyup.enter="submit" />
      </UFormField>

      <UButton
        size="xl"
        class="font-semibold text-white"
        :icon="justSaved ? 'i-lucide-check' : 'i-lucide-plus'"
        :loading="isSaving"
        @click="submit"
      >
        <span :key="String(justSaved)" class="pop">
          {{ justSaved ? $t('weight.log.saved') : $t('weight.log.save') }}
        </span>
      </UButton>
    </div>

    <UAlert
      v-if="error"
      class="mt-4"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />
    <UAlert
      v-if="saveFailed"
      class="mt-4"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('weight.log.saveFailed')"
    />
  </div>
</template>
