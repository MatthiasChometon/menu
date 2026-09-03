<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const {
  day,
  targets,
  date,
  index = 0,
  defaultOpen = false,
  isToday = false,
  otherDayKeys = [],
  weekDays = [],
} = defineProps<{
  day: FlexedDay;
  targets: Macros;
  date?: Date;
  index?: number;
  defaultOpen?: boolean;
  isToday?: boolean;
  otherDayKeys?: DayKey[];
  /** The whole week, in order, so a meal can offer every later slot its
   *  leftovers could cover — not just the day right after it. */
  weekDays?: FlexedDay[];
}>();

const { locale, t } = useNuxtApp().$i18n;
const { selectedWeek } = useSelectedWeek();
const { isDayOff, setDayOff, clearDayOff } = useMealOverrides(selectedWeek);
const { swapDay } = useMealSwap(selectedWeek);
const { assignedOriginOf } = useLeftovers(selectedWeek);

// The slots this day actually has, so "day off" and "swap" only ever touch
// meals the day is showing — never a slot the plan left empty.
const slots = computed((): MealSlot[] => day.meals.map((meal): MealSlot => meal.slot));

// Every day after this one, in week order: what a leftover from today could
// still reach. A slot already spoken for by another origin is left out — one
// pot covers one slot at a time.
const laterDays = computed((): FlexedDay[] => {
  const selfIndex = weekDays.findIndex((entry): boolean => entry.key === day.key);
  return selfIndex === -1 ? [] : weekDays.slice(selfIndex + 1);
});

const leftoverTargetsFor = (slot: MealSlot): DayKey[] =>
  laterDays.value
    .filter(
      (candidate): boolean =>
        candidate.meals.some((meal): boolean => meal.slot === slot) &&
        assignedOriginOf(candidate.key, slot) === undefined,
    )
    .map((candidate): DayKey => candidate.key);

const isOff = computed((): boolean => isDayOff(day.key, slots.value));

const flexItems = computed((): DropdownMenuItem[][] => [
  [
    isOff.value
      ? {
          label: t('menu.flex.dayOff.undo'),
          icon: 'i-lucide-rotate-ccw',
          onSelect: (): void => clearDayOff(day.key, slots.value),
        }
      : {
          label: t('menu.flex.dayOff.mark'),
          icon: 'i-lucide-coffee',
          onSelect: (): void => setDayOff(day.key, slots.value),
        },
  ],
  otherDayKeys.map(
    (otherKey): DropdownMenuItem => ({
      label: `${t('menu.flex.swap.action')} ${t(`menu.day.${otherKey}`)}`,
      icon: 'i-lucide-shuffle',
      onSelect: (): void => swapDay(day.key, otherKey, slots.value),
    }),
  ),
]);

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
      <div class="flex w-full items-center gap-1 px-2 py-2 sm:px-4 sm:py-3.5">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-elevated/50 sm:px-2"
          :aria-expanded="isOpen"
          :aria-controls="`day-${day.key}`"
          @click="isOpen = !isOpen"
        >
          <span class="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2.5">
            <span class="font-serif text-2xl">{{ $t(`menu.day.${day.key}`) }}</span>
            <span v-if="dateLabel !== undefined" class="text-sm text-muted tabular-nums">
              {{ dateLabel }}
            </span>
          </span>
          <UBadge v-if="isToday" color="primary" variant="subtle" size="sm">
            {{ $t('menu.today') }}
          </UBadge>
          <UBadge v-if="isOff" color="warning" variant="subtle" size="sm">
            {{ $t('menu.flex.dayOff.badge') }}
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

        <UDropdownMenu :items="flexItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0"
            :aria-label="$t('menu.flex.dayActions')"
          />
        </UDropdownMenu>
      </div>
    </template>

    <div v-show="isOpen" :id="`day-${day.key}`" class="space-y-1 p-2">
      <MenuMealRow
        v-for="meal in day.meals"
        :key="meal.slot"
        :meal="meal"
        :day-key="day.key"
        :leftover-targets="leftoverTargetsFor(meal.slot)"
      />

      <div class="mt-2 rounded-2xl bg-elevated/50 p-4">
        <p class="mb-3 text-sm font-semibold">{{ $t('menu.dayTotal') }}</p>
        <MenuMacroBar :macros="day.macros" :targets="targets" compact />
      </div>
    </div>
  </UCard>
</template>
