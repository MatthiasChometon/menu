<script setup lang="ts">
const {
  steps,
  step,
  stepCount,
  days,
  canReachStep,
  isStepComplete,
  goToStep,
  needsSpread,
  spread,
} = usePlanner();
const { t } = useNuxtApp().$i18n;

const hasWeek = computed((): boolean => days.value.some((day): boolean => day.meals.length > 0));

// The step names, so the bar says what it is walking through rather than just
// how far along it is.
const stepLabels = computed((): string[] => [
  ...steps.map((groups): string =>
    groups.map((group): string => t(`planner.group.${group}`)).join(' & '),
  ),
  t('planner.week'),
]);

// Done, not passed. Colouring by position meant a step already filled went grey
// again the moment you walked back past it — the bar has to answer "what is
// settled", which is not the same question as "where am I".
const isStepDone = (index: number): boolean => {
  if (!canReachStep(index)) return false;

  return index >= steps.length ? hasWeek.value : isStepComplete(index);
};

// Spreading is what turns four lists into a week, and it has to happen however
// the week is reached: the steps are clickable, and arriving through the bar
// used to land on an empty week with nothing to save.
const enterWeek = (): void => {
  // Also when the selection moved since the last spread: otherwise the week
  // still shows the dishes chosen before, and the new one never reaches it.
  if (needsSpread.value) spread();
};

const onStep = (index: number): void => {
  if (index === steps.length) enterWeek();
  goToStep(index);
};
</script>

<template>
  <!-- Where you are and how much is left, in one line: four choices feel long
       only when you cannot see the end of them. -->
  <div class="rise">
    <div class="flex items-center justify-between gap-3 text-sm">
      <h1 class="font-semibold">{{ $t('planner.pageTitle') }}</h1>
      <p class="shrink-0 tabular-nums text-muted">
        {{ Math.min(step + 1, stepCount) }} / {{ stepCount }}
      </p>
    </div>
    <!-- Named and clickable: knowing a step is called "Goûter" is what lets
         you jump back to it, and a bar you cannot walk back through makes a
         mistake feel final. -->
    <nav class="mt-2 flex gap-1.5 overflow-x-auto pb-1" :aria-label="$t('planner.pageTitle')">
      <button
        v-for="(label, index) in stepLabels"
        :key="label"
        type="button"
        class="group flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors"
        :class="
          canReachStep(index)
            ? 'cursor-pointer hover:bg-elevated focus-visible:bg-elevated'
            : 'cursor-not-allowed opacity-40'
        "
        :disabled="!canReachStep(index)"
        :aria-current="index === step ? 'step' : undefined"
        @click="onStep(index)"
      >
        <span
          class="h-1.5 rounded-full transition-colors"
          :class="[
            isStepDone(index) ? 'bg-primary' : index === step ? 'bg-primary/40' : 'bg-elevated',
            canReachStep(index) && !isStepDone(index) ? 'group-hover:bg-primary/40' : '',
          ]"
        />
        <!-- Read out but not drawn on a phone: five names in three hundred and
             ninety pixels came out as "Déjeun…", "Petit-déj…", "Post-trai…",
             which name nothing. The step's real title sits right underneath
             in full, so the bar is left to do the one job it can do at that
             width — show how far along the week is. -->
        <span
          class="sr-only text-[0.7rem] leading-tight transition-colors sm:not-sr-only sm:truncate"
          :class="
            index === step
              ? 'font-bold text-primary'
              : canReachStep(index)
                ? 'text-muted group-hover:text-highlighted'
                : 'text-muted'
          "
        >
          {{ label }}
        </span>
      </button>
    </nav>
  </div>
</template>
