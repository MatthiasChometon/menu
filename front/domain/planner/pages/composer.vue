<script setup lang="ts">
const { days, targets, isComplete, isValid, copyDay, plan } = usePlanner();
const { dayOrder } = useMenu();
const { round } = useFoodFormat();
const { isPersonalised } = useMyQuantities();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const filledDays = computed((): PlannedDay[] =>
  days.value.filter((day): boolean => day.meals.length > 0),
);

// Copying the first composed day over the empty ones is the shortcut that makes
// planning a week bearable: most days repeat with one dish swapped.
const firstFilled = computed((): PlannedDay | undefined => filledDays.value[0]);

const fillTheWeek = (): void => {
  const source = firstFilled.value;
  if (source === undefined) return;

  for (const key of dayOrder) {
    if (key !== source.key) copyDay(source.key, key);
  }
};

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

    <div class="rise mt-5 flex flex-wrap items-center gap-2">
      <UButton
        v-if="firstFilled !== undefined"
        icon="i-lucide-copy"
        variant="outline"
        color="neutral"
        size="sm"
        @click="fillTheWeek"
      >
        {{ $t('planner.fillWeek') }}
      </UButton>
      <UBadge
        v-if="filledDays.length > 0"
        :color="isValid && isComplete ? 'primary' : 'neutral'"
        variant="subtle"
      >
        {{ filledDays.length }} / {{ dayOrder.length }} {{ $t('planner.daysPlanned') }}
      </UBadge>
    </div>

    <section class="mt-6 space-y-4">
      <PlannerDayPlanner
        v-for="(day, index) in days"
        :key="day.key"
        :day="day"
        :index="index"
        :default-open="index === 0"
      />
    </section>

    <!-- Saving belongs to the account, which is not online yet. Saying so beats
         a button that quietly does nothing. -->
    <section class="rise mt-8 rounded-2xl border border-default bg-elevated/40 p-5">
      <h2 class="flex items-center gap-2 font-bold">
        <UIcon name="i-lucide-cloud-off" class="size-5 text-dimmed" />
        {{ $t('planner.saving.title') }}
      </h2>
      <p class="mt-2 text-sm text-muted">{{ $t('planner.saving.hint') }}</p>
      <p class="mt-1 text-xs text-dimmed">{{ plan.weekOf }}</p>
    </section>
  </div>
</template>
