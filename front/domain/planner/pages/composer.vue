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
  goToStep,
  canReachStep,
  isGroupComplete,
  limitsOf,
  chosenDishes,
  completeSelection,
  canSpread,
  spread,
  isValid,
  isSaving,
  canSave,
  isDirty,
  saveFailed,
  savedAt,
  save,
  loadFromAccount,
} = usePlanner();
const { dayOrder } = useMenu();

// Long enough to be noticed while looking down at a phone, short enough not to
// hide the button's real purpose.
const JUST_SAVED_MS = 2500;

const justSaved = ref(false);
const savedLabel = computed((): string =>
  savedAt.value === undefined
    ? ''
    : new Date(savedAt.value).toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
      }),
);

watch(savedAt, (at): void => {
  if (at === undefined) return;

  justSaved.value = true;
  const timer = setTimeout((): void => {
    justSaved.value = false;
  }, JUST_SAVED_MS);
  onScopeDispose((): void => clearTimeout(timer));
});

const hasAnyChoice = computed((): boolean =>
  Object.values(chosenDishes.value).some((picked): boolean => (picked ?? []).length > 0),
);
const { round } = useFoodFormat();
const { isPersonalised } = useMyQuantities();
const { isLoading: isLoadingProfile } = useProfile();
const { user } = useAuth();
const { t, locale } = useNuxtApp().$i18n;
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
// Every step has a floor now: a week missing a meal is one the solver has to
// stretch past what anyone eats, and it falls off target.
const canLeaveStep = computed(
  (): boolean => currentGroup.value === undefined || isGroupComplete(currentGroup.value),
);

const missing = computed((): number => {
  if (currentGroup.value === undefined) return 0;
  return Math.max(0, limitsOf(currentGroup.value).min - pickedInStep.value);
});

// The step names, so the bar says what it is walking through rather than just
// how far along it is.
const stepLabels = computed((): string[] => [
  ...groupOrder.map((group): string => t(`planner.group.${group}`)),
  t('planner.week'),
]);

// Done, not passed. Colouring by position meant a step already filled went grey
// again the moment you walked back past it — the bar has to answer "what is
// settled", which is not the same question as "where am I".
const isStepDone = (index: number): boolean => {
  const group = groupOrder[index];
  return group === undefined ? hasWeek.value : isGroupComplete(group);
};

// Spreading is what turns four lists into a week, and it has to happen however
// the week is reached: the steps are clickable, and arriving through the bar
// used to land on an empty week with nothing to save.
const enterWeek = (): void => {
  if (canSpread.value && !hasWeek.value) spread();
};

const onNext = (): void => {
  if (step.value === groupOrder.length - 1) enterWeek();
  goNext();
};

const onStep = (index: number): void => {
  if (index === groupOrder.length) enterWeek();
  goToStep(index);
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
          <span
            class="truncate text-[0.7rem] leading-tight transition-colors"
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

    <!-- Never the menu's own targets while the profile is still on its way:
         showing 3100 kcal and swapping it for 2939 tells the reader a number
         they may already have taken for the answer. -->
    <USkeleton v-if="step === 0 && isLoadingProfile" class="mt-5 h-20 rounded-lg" />
    <span v-if="step === 0 && isLoadingProfile" class="sr-only">
      {{ $t('accessibility.loading') }}
    </span>

    <UAlert
      v-else-if="step === 0"
      class="rise mt-5"
      color="neutral"
      variant="subtle"
      icon="i-lucide-scale"
      :title="`${$t('planner.targets')} ${round(targets.kcal)} ${$t('menu.unit.kcal')} · ${round(targets.protein)} ${$t('menu.unit.gram')} ${$t('menu.macroShort.protein')}`"
      :description="isPersonalised ? $t('planner.targetsMine') : $t('planner.targetsDefault')"
    />

    <!-- One meal group at a time. -->
    <div v-if="currentGroup !== undefined" class="rise mt-6">
      <div v-if="step === 0 && !hasAnyChoice" class="mb-5 rounded-2xl border border-default p-4">
        <p class="text-sm text-muted">{{ $t('planner.completeHint') }}</p>
        <UButton
          class="mt-3"
          icon="i-lucide-wand-sparkles"
          variant="outline"
          @click="completeSelection"
        >
          {{ $t('planner.complete') }}
        </UButton>
      </div>

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
          icon="i-lucide-refresh-cw"
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

      <PlannerHouseholdBalance v-if="hasWeek" />

      <section
        v-if="hasWeek"
        class="rise mt-8 rounded-2xl border border-default bg-elevated/40 p-5"
      >
        <div class="flex flex-wrap items-center gap-3">
          <!-- The button confirms its own action. It is where the finger and
               the eye already are, so nothing has to appear elsewhere and
               nothing flies past while somebody is looking down. -->
          <UButton
            :icon="justSaved ? 'i-lucide-check' : 'i-lucide-cloud-upload'"
            :color="justSaved ? 'success' : 'primary'"
            :loading="isSaving"
            :disabled="!canSave && !justSaved"
            class="transition-colors"
            @click="save"
          >
            <span :key="String(justSaved)" class="pop">
              {{ justSaved ? $t('planner.saving.justDone') : $t('planner.save') }}
            </span>
          </UButton>
          <p v-if="user === undefined" class="text-sm text-muted">
            {{ $t('planner.saving.signedOut') }}
          </p>
          <p v-else-if="saveFailed" class="text-sm text-error" role="alert">
            {{ $t('planner.saving.failed') }}
          </p>
          <p v-else-if="isDirty" class="text-sm text-muted">{{ $t('planner.saving.pending') }}</p>
          <p v-else-if="savedAt === undefined" class="text-sm text-muted">
            {{ $t('planner.saving.nothingToSave') }}
          </p>
          <!-- Kept afterwards, with the time: the question "is it actually
               saved?" comes back long after the confirmation has gone. -->
          <p v-else-if="savedAt !== undefined" class="text-sm text-muted">
            {{ $t('planner.saving.done') }} {{ savedLabel }}
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
          {{ $t('planner.next') }}
        </UButton>
      </div>
      <p v-if="missing > 0" class="mx-auto mt-2 max-w-3xl text-xs text-error">
        {{ $t('planner.stillNeeded') }} {{ missing }}
      </p>
    </div>
  </div>
</template>
