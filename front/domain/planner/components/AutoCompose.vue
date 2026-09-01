<script setup lang="ts">
const { generateWeek, isGenerating, isImproving, pastComposedWeeks, duplicateFrom, goToStep, steps } =
  usePlanner();
const { labelOf } = usePlannerWeek();

const isPreferencesOpen = ref(false);
const selectedSource = ref<string | undefined>(undefined);

const weekOptions = computed((): SelectItem[] =>
  pastComposedWeeks.value.map((entry): SelectItem => ({
    label: labelOf(entry.weekOf),
    value: entry.weekOf,
  })),
);

// Whichever way the week lands — freshly generated or copied from before —
// the reader is taken straight to it, the same jump the last step already
// makes when it is reached by hand.
const showTheWeek = (): void => {
  goToStep(steps.length);
};

const onGenerate = async (): Promise<void> => {
  await generateWeek();
  showTheWeek();
};

const onDuplicate = (): void => {
  if (selectedSource.value === undefined) return;

  duplicateFrom(selectedSource.value);
  showTheWeek();
};
</script>

<template>
  <section class="rounded-2xl border border-primary/30 bg-primary/5 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="font-serif text-xl tracking-tight">{{ $t('planner.generate.action') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t('planner.generate.hint') }}</p>
      </div>
      <UButton
        icon="i-lucide-sparkles"
        size="lg"
        class="shrink-0 font-semibold text-white"
        :loading="isGenerating"
        :disabled="isGenerating || isImproving"
        @click="onGenerate"
      >
        {{ $t('planner.generate.action') }}
      </UButton>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/20 pt-3">
      <UButton
        icon="i-lucide-sliders-horizontal"
        variant="outline"
        color="neutral"
        size="sm"
        @click="isPreferencesOpen = true"
      >
        {{ $t('planner.preferences.open') }}
      </UButton>

      <template v-if="weekOptions.length > 0">
        <USelect
          v-model="selectedSource"
          :items="weekOptions"
          value-key="value"
          size="sm"
          class="min-w-40"
          :placeholder="$t('planner.duplicate.label')"
          :aria-label="$t('planner.duplicate.label')"
        />
        <UButton
          variant="soft"
          color="neutral"
          size="sm"
          :disabled="selectedSource === undefined"
          @click="onDuplicate"
        >
          {{ $t('planner.duplicate.action') }}
        </UButton>
      </template>
    </div>

    <PlannerPreferencesPanel v-model="isPreferencesOpen" />
  </section>
</template>
