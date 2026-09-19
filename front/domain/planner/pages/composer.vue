<script setup lang="ts">
const {
  days,
  targets,
  steps,
  step,
  currentGroups,
  isStepComplete,
  isLastStep,
  goNext,
  goBack,
  limitsOf,
  chosenDishes,
  completeSelection,
  budgetStatus,
  canSpread,
  needsSpread,
  spread,
  improveWeek,
  isImproving,
  isValid,
  isSaving,
  canSave,
  isDirty,
  saveFailed,
  savedAt,
  save,
  loadFromAccount,
  switchWeek,
} = usePlanner();
const { dayOrder } = useMenu();
const { week: plannerWeek, labelOf } = usePlannerWeek();
// The week the rest of the app shows is its own state; on a successful save we
// point it at the week just composed and go there, so the reader sees their
// menu instead of landing on whatever week the home would have opened on.
const { selectedWeek } = useSelectedWeek();

const saveAndView = async (): Promise<void> => {
  await save();
  if (saveFailed.value) return;

  selectedWeek.value = plannerWeek.value;
  await navigateTo(localePath('/'));
};

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

// Only the savoury dishes are required: a week with no lunch cannot be spread.
// The other steps may be skipped, so the button says so rather than blocking.
// Every step has a floor now: a week missing a meal is one the solver has to
// stretch past what anyone eats, and it falls off target.
const canLeaveStep = computed(
  (): boolean => currentGroups.value === undefined || isStepComplete(step.value),
);

const missing = computed((): number =>
  (currentGroups.value ?? []).reduce((total, group): number => {
    const picked = (chosenDishes.value[group] ?? []).length;
    return total + Math.max(0, limitsOf(group).min - picked);
  }, 0),
);

// Spreading is what turns four lists into a week, and it has to happen however
// the week is reached: the steps are clickable, and arriving through the bar
// used to land on an empty week with nothing to save.
const enterWeek = (): void => {
  // Also when the selection moved since the last spread: otherwise the week
  // still shows the dishes chosen before, and the new one never reaches it.
  if (needsSpread.value) spread();
};

const onNext = (): void => {
  if (step.value === steps.length - 1) enterWeek();
  goNext();
};

onMounted((): void => {
  void loadFromAccount();
});

watch(user, (): void => {
  void loadFromAccount();
});

// Watched from the page rather than from the composable: every picker calls
// usePlanner too, and a watcher declared there would fire once per component,
// each one parking the week over the last one's work.
watch(plannerWeek, (week, previous): void => {
  switchWeek(week, previous);
});

useSeoMeta({ title: (): string => t('planner.pageTitle') });

// Tells the shell this page pins a bar to the bottom of the screen, so the
// footer underneath it gets out of the way. Dropped again on the way out.
useHead({ bodyAttrs: { class: 'has-action-bar' } });
</script>

<template>
  <!-- data-hydrated marks the point where the pickers actually respond: the
       markup is served before Vue attaches its listeners, and a tap landing in
       that window does nothing at all. -->
  <div class="mx-auto max-w-3xl px-4 py-6" :data-hydrated="isMounted ? '' : undefined">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('menu.nav.week') }}
    </UButton>

    <PlannerWeekChooser class="rise mb-5" />
    <PlannerAutoCompose class="rise mb-5" />

    <PlannerStepBar />

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

    <!-- One picker per screen. The afternoon en-cas used to be two lists on one
         screen — the second went unseen — and are now a single "Goûter et
         collation" list, two picks that fill both slots. -->
    <div v-if="currentGroups !== undefined" class="rise mt-6">
      <div class="space-y-10">
        <PlannerDishPicker v-for="group in currentGroups" :key="group" :group="group" />
      </div>

      <!-- Under the cards on purpose: it vanishes on the first pick, and
           vanishing above the grid moved every dish out from under the
           finger. -->
      <div v-if="step === 0 && !hasAnyChoice" class="mt-5 rounded-2xl border border-default p-4">
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
    </div>

    <!-- The week, once the choices are made. -->
    <template v-else>
      <div class="rise mt-6">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-serif text-3xl tracking-tight">{{ $t('planner.week') }}</h2>
          <UBadge :color="isValid ? 'primary' : 'neutral'" variant="subtle">
            {{ filledDays.length }} / {{ dayOrder.length }} {{ $t('planner.daysPlanned') }}
          </UBadge>
          <!-- The same figure as the pickers showed while choosing, now read
               off the plan that actually got spread onto the days. -->
          <UBadge
            v-if="budgetStatus.budget !== undefined"
            :color="budgetStatus.isOverBudget ? 'warning' : 'neutral'"
            variant="subtle"
          >
            {{ round(budgetStatus.cost) }} € / {{ round(budgetStatus.budget) }} €
            <span v-if="budgetStatus.isOverBudget">— {{ $t('planner.budget.over') }}</span>
          </UBadge>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <!-- One tap mends every day at once. Off-target days each take their
                 best swap; a week already on target has nothing to do, so it is
                 greyed rather than left to be pressed for no effect. It solves a
                 whole week's swaps, so it spins while it works rather than
                 freezing the page. -->
            <UButton
              v-if="hasWeek"
              icon="i-lucide-wand-sparkles"
              variant="soft"
              color="primary"
              size="sm"
              class="font-semibold"
              :loading="isImproving"
              :disabled="isValid || isImproving"
              @click="improveWeek"
            >
              {{ $t('planner.improveWeek') }}
            </UButton>
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="!canSpread"
              @click="spread"
            >
              {{ $t('planner.spreadAgain') }}
            </UButton>
            <!-- Save lives here, next to the week it saves and the badge that
                 says it is on target, rather than only in the bottom bar. -->
            <UButton
              v-if="hasWeek"
              :icon="justSaved ? 'i-lucide-check' : 'i-lucide-cloud-upload'"
              :color="justSaved ? 'success' : 'primary'"
              size="sm"
              class="font-semibold text-white"
              :loading="isSaving"
              :disabled="!canSave && !justSaved"
              @click="saveAndView"
            >
              <span :key="String(justSaved)" class="pop">
                {{ justSaved ? $t('planner.saving.justDone') : $t('planner.save') }}
              </span>
            </UButton>
          </div>
        </div>

        <!-- Why the save button is grey, right under it: signed out, nothing
             changed, or already done — said where the eye already is. -->
        <div v-if="hasWeek" class="mt-2" aria-live="polite">
          <p v-if="user === undefined" class="text-sm text-muted">
            {{ $t('planner.saving.signedOut') }}
          </p>
          <p v-else-if="saveFailed" class="text-sm text-error" role="alert">
            {{ $t('planner.saving.failed') }}
          </p>
          <p v-else-if="isDirty" class="text-sm text-muted">{{ $t('planner.saving.pending') }}</p>
          <p v-else-if="savedAt !== undefined" class="text-sm text-muted">
            {{ $t('planner.saving.done') }} {{ savedLabel }} —
            {{ labelOf(plannerWeek).toLowerCase() }}
          </p>
          <p v-else class="text-sm text-muted">{{ $t('planner.saving.nothingToSave') }}</p>
        </div>
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
    </template>

    <!-- The way forward stays under the thumb, whatever the length of the list.
         Sat above the tab bar on a phone, not on top of it: at bottom-0 the
         nav covered all but ten pixels of the button, so a thumb aiming at
         "Suivant" opened "Mon profil" instead. The offset is the nav's own
         height plus whatever the phone reserves at the bottom of the screen;
         the tab bar shows below lg — on a tablet too — so the bar clears it up
         to there and only goes back to the floor once the nav is gone. A test
         holds the two apart, so neither can drift into the other. -->
    <div
      class="fixed inset-x-0 bottom-[calc(4.125rem+env(safe-area-inset-bottom))] z-30 border-t border-default bg-default/95 px-4 pb-4 pt-3 backdrop-blur-lg lg:bottom-0 lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
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
      <!-- Why the button is grey, in the one place the eye is already looking. -->
      <p v-if="missing > 0" class="mx-auto mt-2 max-w-3xl text-xs text-muted">
        {{ $t('planner.stillNeeded') }} {{ missing }}
      </p>
    </div>
  </div>
</template>
