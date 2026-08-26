<script setup lang="ts">
const {
  day,
  targets,
  date,
  index = 0,
  defaultOpen = false,
  isToday = false,
} = defineProps<{
  day: Day;
  targets: Macros;
  date?: Date;
  index?: number;
  defaultOpen?: boolean;
  isToday?: boolean;
}>();

const { locale } = useNuxtApp().$i18n;

// "Lundi" alone does not say which Monday. Reading a week meant counting rows
// to work out where today was, and a shopping list bought on the wrong week is
// the mistake that costs a trip.
const dateLabel = computed((): string | undefined =>
  date === undefined
    ? undefined
    : date.toLocaleDateString(locale.value, { day: 'numeric', month: 'long' }),
);

// A day already gone, dimmed so the eye skips it: the week reads as "here is
// what is left", not "here is a list you must scan for the useful rows".
//
// Client-only, like the open card below: "now" on a prerendered page is the day
// it was built, so before hydration nothing is greyed rather than the wrong
// thing being greyed.
const isMounted = useMounted();
const isPast = computed((): boolean => {
  if (!isMounted.value || date === undefined || isToday) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return date < startOfToday;
});

const isOpen = ref(defaultOpen);

// The current day is only known once mounted (a prerendered page would freeze
// whatever day it was built on), so the open card follows that late signal.
watch(
  (): boolean => defaultOpen,
  (value): void => {
    isOpen.value = value;
  },
);
</script>

<template>
  <UCard
    class="rise overflow-hidden transition-opacity"
    :data-today="isToday ? '' : undefined"
    :data-past="isPast ? '' : undefined"
    :class="[isToday && 'ring-2 ring-primary/40', isPast && 'opacity-55']"
    :style="{ animationDelay: `${Math.min(index, 6) * 60}ms` }"
    :ui="{ body: 'p-0 sm:p-0', header: 'p-0 sm:p-0' }"
  >
    <template #header>
      <button
        type="button"
        class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-elevated/50"
        :aria-expanded="isOpen"
        :aria-controls="`day-${day.key}`"
        @click="isOpen = !isOpen"
      >
        <span class="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2">
          <span class="text-lg font-bold">{{ $t(`menu.day.${day.key}`) }}</span>
          <span v-if="dateLabel !== undefined" class="text-sm text-muted tabular-nums">
            {{ dateLabel }}
          </span>
        </span>
        <UBadge v-if="isToday" color="primary" variant="subtle" size="sm">
          {{ $t('menu.today') }}
        </UBadge>
        <span class="ml-auto text-sm tabular-nums text-muted">
          {{ Math.round(day.macros.kcal) }} {{ $t('menu.unit.kcal') }}
        </span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 text-dimmed transition-transform duration-300"
          :class="isOpen && 'rotate-180'"
        />
      </button>
    </template>

    <div v-show="isOpen" :id="`day-${day.key}`" class="space-y-1 p-2">
      <MenuMealRow v-for="meal in day.meals" :key="meal.slot" :meal="meal" :day-key="day.key" />

      <div class="mt-2 rounded-2xl bg-elevated/50 p-4">
        <p class="mb-3 text-sm font-semibold">{{ $t('menu.dayTotal') }}</p>
        <MenuMacroBar :macros="day.macros" :targets="targets" compact />
      </div>
    </div>
  </UCard>
</template>
