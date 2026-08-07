<script setup lang="ts">
const {
  days,
  targets,
  groupOrder,
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

const filledDays = computed((): PlannedDay[] =>
  days.value.filter((day): boolean => day.meals.length > 0),
);

const hasWeek = computed((): boolean => filledDays.value.length > 0);

// The account's week wins over whatever the tab held, but only once: reloading
// it on every visit would throw away edits made since.
onMounted((): void => {
  void loadFromAccount();
});

watch(user, (): void => {
  void loadFromAccount();
});

useSeoMeta({ title: (): string => t('planner.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('menu.nav.week') }}
    </UButton>

    <header class="rise">
      <h1 class="text-3xl font-black tracking-tight">{{ $t('planner.pageTitle') }}</h1>
      <p class="mt-1 text-muted">{{ $t('planner.pageLead') }}</p>
    </header>

    <UAlert
      class="rise mt-5"
      color="neutral"
      variant="subtle"
      icon="i-lucide-scale"
      :title="`${$t('planner.targets')} ${round(targets.kcal)} ${$t('menu.unit.kcal')} · ${round(targets.protein)} ${$t('menu.unit.gram')} ${$t('menu.macroShort.protein')}`"
      :description="isPersonalised ? $t('planner.targetsMine') : $t('planner.targetsDefault')"
    />

    <!-- Choose the dishes first, one group at a time; the days come after. -->
    <div class="mt-8 space-y-8">
      <PlannerDishPicker
        v-for="(group, index) in groupOrder"
        :key="group"
        :group="group"
        :index="index"
      />
    </div>

    <section
      class="rise sticky bottom-4 z-30 mt-8 rounded-2xl border border-default bg-default/90 p-4 backdrop-blur-lg"
    >
      <UButton
        icon="i-lucide-shuffle"
        size="lg"
        block
        :disabled="!canSpread"
        class="font-semibold text-white"
        @click="spread"
      >
        {{ hasWeek ? $t('planner.spreadAgain') : $t('planner.spread') }}
      </UButton>
      <p class="mt-2 text-center text-xs text-muted">
        {{ canSpread ? $t('planner.spreadHint') : $t('planner.spreadBlocked') }}
      </p>
    </section>

    <template v-if="hasWeek">
      <div class="rise mt-8 flex flex-wrap items-center gap-2">
        <h2 class="text-xl font-bold">{{ $t('planner.week') }}</h2>
        <UBadge :color="isValid ? 'primary' : 'neutral'" variant="subtle">
          {{ filledDays.length }} / {{ dayOrder.length }} {{ $t('planner.daysPlanned') }}
        </UBadge>
      </div>

      <section class="mt-4 space-y-4">
        <PlannerDayPlanner
          v-for="(day, index) in days"
          :key="day.key"
          :day="day"
          :index="index"
          :default-open="index === 0"
        />
      </section>

      <!-- Saving belongs to the account: a week kept in a tab is a week lost on
           the next device. -->
      <section class="rise mt-8 rounded-2xl border border-default bg-elevated/40 p-5">
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
  </div>
</template>
