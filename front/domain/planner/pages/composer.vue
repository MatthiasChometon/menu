<script setup lang="ts">
const {
  days,
  targets,
  groupOrder,
  step,
  stepCount,
  currentGroup,
  isLastStep,
  goNext,
  goBack,
  chosenDishes,
  canSpread,
  spread,
  isValid,
  isSaving,
  canSave,
  isDirty,
  savedAt,
  save,
  loadFromAccount,
} = usePlanner();
const { dayOrder } = useMenu();
const { round } = useFoodFormat();
const { isPersonalised } = useMyQuantities();
const { user } = useAuth();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const isMounted = useMounted();

const filledDays = computed((): PlannedDay[] =>
  days.value.filter((day): boolean => day.meals.length > 0),
);

const hasWeek = computed((): boolean => filledDays.value.length > 0);

const pickedInStep = computed((): number =>
  currentGroup.value === undefined ? 0 : (chosenDishes.value[currentGroup.value] ?? []).length,
);

// Only the savoury dishes are required: a week with no lunch cannot be spread.
// The other steps may be skipped, so the button says so rather than blocking.
const canLeaveStep = computed(
  (): boolean => currentGroup.value !== 'main' || pickedInStep.value > 0,
);

const nextLabel = computed((): string => {
  if (currentGroup.value === undefined) return '';
  if (pickedInStep.value === 0 && currentGroup.value !== 'main') return t('planner.skip');
  return t('planner.next');
});

// Spreading is what turns four lists into a week; it happens once, on the way
// into the last step, so the reader never has to ask for it.
const onNext = (): void => {
  const isEnteringWeek = step.value === groupOrder.length - 1;
  if (isEnteringWeek) spread();
  goNext();
};

onMounted((): void => {
  void loadFromAccount();
});

watch(user, (): void => {
  void loadFromAccount();
});

useSeoMeta({ title: (): string => t('planner.pageTitle') });
</script>

<template>
  <!-- data-hydrated marks the point where the pickers actually respond: the
       markup is served before Vue attaches its listeners, and a tap landing in
       that window does nothing at all. -->
  <div class="mx-auto max-w-3xl px-4 py-6 pb-28" :data-hydrated="isMounted ? '' : undefined">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('menu.nav.week') }}
    </UButton>

    <!-- Where you are and how much is left, in one line: four choices feel long
         only when you cannot see the end of them. -->
    <div class="rise">
      <div class="flex items-center justify-between gap-3 text-sm">
        <p class="font-semibold">{{ $t('planner.pageTitle') }}</p>
        <p class="shrink-0 tabular-nums text-muted">
          {{ Math.min(step + 1, stepCount) }} / {{ stepCount }}
        </p>
      </div>
      <div class="mt-2 flex gap-1.5" aria-hidden="true">
        <span
          v-for="index in stepCount"
          :key="index"
          class="h-1.5 flex-1 rounded-full transition-colors"
          :class="index <= step + 1 ? 'bg-primary' : 'bg-elevated'"
        />
      </div>
    </div>

    <UAlert
      v-if="step === 0"
      class="rise mt-5"
      color="neutral"
      variant="subtle"
      icon="i-lucide-scale"
      :title="`${$t('planner.targets')} ${round(targets.kcal)} ${$t('menu.unit.kcal')} · ${round(targets.protein)} ${$t('menu.unit.gram')} ${$t('menu.macroShort.protein')}`"
      :description="isPersonalised ? $t('planner.targetsMine') : $t('planner.targetsDefault')"
    />

    <!-- One meal group at a time. -->
    <div v-if="currentGroup !== undefined" class="rise mt-6">
      <PlannerDishPicker :group="currentGroup" />
    </div>

    <!-- The week, once the choices are made. -->
    <template v-else>
      <div class="rise mt-6 flex flex-wrap items-center gap-2">
        <h2 class="text-2xl font-black tracking-tight">{{ $t('planner.week') }}</h2>
        <UBadge :color="isValid ? 'primary' : 'neutral'" variant="subtle">
          {{ filledDays.length }} / {{ dayOrder.length }} {{ $t('planner.daysPlanned') }}
        </UBadge>
        <UButton
          icon="i-lucide-shuffle"
          variant="ghost"
          color="neutral"
          size="sm"
          class="ml-auto"
          :disabled="!canSpread"
          @click="spread"
        >
          {{ $t('planner.spreadAgain') }}
        </UButton>
      </div>

      <p v-if="!hasWeek" class="mt-3 text-sm text-muted">{{ $t('planner.spreadBlocked') }}</p>

      <section v-else class="mt-4 space-y-4">
        <PlannerDayPlanner
          v-for="(day, index) in days"
          :key="day.key"
          :day="day"
          :index="index"
          :default-open="index === 0"
        />
      </section>

      <section
        v-if="hasWeek"
        class="rise mt-8 rounded-2xl border border-default bg-elevated/40 p-5"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            icon="i-lucide-cloud-upload"
            :loading="isSaving"
            :disabled="!canSave"
            @click="save"
          >
            {{ $t('planner.save') }}
          </UButton>
          <p v-if="user === undefined" class="text-sm text-muted">
            {{ $t('planner.saving.signedOut') }}
          </p>
          <p v-else-if="isDirty" class="text-sm text-muted">{{ $t('planner.saving.pending') }}</p>
          <p v-else-if="savedAt !== undefined" class="text-sm text-primary">
            {{ $t('planner.saving.done') }}
          </p>
        </div>
      </section>
    </template>

    <!-- The way forward stays under the thumb, whatever the length of the list. -->
    <div
      class="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-default/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg sm:bottom-0"
    >
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <UButton
          v-if="step > 0"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          @click="goBack"
        >
          {{ $t('planner.back') }}
        </UButton>
        <UButton
          v-if="!isLastStep"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
          class="ml-auto font-semibold text-white"
          :disabled="!canLeaveStep"
          @click="onNext"
        >
          {{ nextLabel }}
        </UButton>
      </div>
      <p v-if="!canLeaveStep" class="mx-auto mt-2 max-w-3xl text-xs text-muted">
        {{ $t('planner.spreadBlocked') }}
      </p>
    </div>
  </div>
</template>
