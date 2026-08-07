<script setup lang="ts">
const {
  day,
  index = 0,
  defaultOpen = false,
} = defineProps<{
  day: PlannedDay;
  index?: number;
  defaultOpen?: boolean;
}>();

// Collapsed by default. Seven days of five pickers is thirty-five dropdowns
// mounted at once: a wall on a phone, and heavy enough to make the screen lag
// on every choice.
const isOpen = ref(defaultOpen);

const { mealOrder } = useMenu();
const { recipesFor, chosen, choose, clearDay } = usePlanner();
const { nameOf, round } = useFoodFormat();
const { t } = useNuxtApp().$i18n;

const itemsFor = (slot: MealSlot): SelectItem[] =>
  recipesFor(slot).map((recipe): SelectItem => ({ label: nameOf(recipe), value: recipe.id }));

const isEmpty = computed((): boolean => day.meals.length === 0);

// Only the three that are steered say anything useful while composing; fibre and
// calories follow, and are shown in the day's summary line.
const steered = computed((): MacroVerdict[] =>
  day.verdicts.filter((verdict): boolean => verdict.macro !== 'kcal'),
);

const gapLabel = (verdict: MacroVerdict): string => {
  const sign = verdict.gapPercent > 0 ? '+' : '';
  return `${sign}${Math.round(verdict.gapPercent)} %`;
};

const statusColor = computed((): 'primary' | 'error' | 'neutral' => {
  if (isEmpty.value) return 'neutral';
  return day.isValid ? 'primary' : 'error';
});

const statusLabel = computed((): string => {
  if (isEmpty.value) return t('planner.day.empty');
  if (day.isImpossible) return t('planner.day.impossible');
  return day.isValid ? t('planner.day.valid') : t('planner.day.off');
});
</script>

<template>
  <UCard class="rise" :style="{ animationDelay: `${Math.min(index, 6) * 50}ms` }">
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        :aria-expanded="isOpen"
        :aria-controls="`plan-${day.key}`"
        @click="isOpen = !isOpen"
      >
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 shrink-0 text-dimmed transition-transform duration-300"
          :class="isOpen && 'rotate-180'"
        />
        <span class="text-lg font-bold">{{ $t(`menu.day.${day.key}`) }}</span>
        <UBadge :color="statusColor" variant="subtle" size="sm">{{ statusLabel }}</UBadge>
        <span v-if="!isEmpty" class="ml-auto text-sm tabular-nums text-muted">
          {{ round(day.macros.kcal) }} {{ $t('menu.unit.kcal') }}
        </span>
      </button>
      <UButton
        v-if="!isEmpty"
        icon="i-lucide-eraser"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="$t('planner.clearDay')"
        @click="clearDay(day.key)"
      />
    </div>

    <!-- v-if, not v-show: an unmounted picker is one the browser never lays out,
         which is the whole point of collapsing them. -->
    <div v-if="isOpen" :id="`plan-${day.key}`" class="mt-4 grid gap-2">
      <div v-for="slot in mealOrder" :key="slot" class="flex items-center gap-3">
        <span class="w-28 shrink-0 text-sm text-muted">{{ $t(`menu.meal.${slot}`) }}</span>
        <USelect
          :model-value="chosen(day.key, slot)"
          :items="itemsFor(slot)"
          value-key="value"
          size="sm"
          class="min-w-0 flex-1"
          :placeholder="$t('planner.choose')"
          :aria-label="$t(`menu.meal.${slot}`)"
          @update:model-value="(value: string) => choose(day.key, slot, value)"
        />
        <UButton
          v-if="chosen(day.key, slot) !== undefined"
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="sm"
          :aria-label="$t('planner.clearSlot')"
          @click="choose(day.key, slot, undefined)"
        />
      </div>
    </div>

    <!-- The gap, not just a red light: knowing the day is 18 % short on protein
         is what tells you which dish to swap. -->
    <div v-if="!isEmpty && isOpen" class="mt-4 flex flex-wrap gap-2 border-t border-default pt-3">
      <span
        v-for="verdict in steered"
        :key="verdict.macro"
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
        :class="
          verdict.isWithinTolerance
            ? 'bg-primary/10 text-primary'
            : 'bg-error/10 text-error font-semibold'
        "
      >
        <span>{{ $t(`menu.macroShort.${verdict.macro}`) }}</span>
        <span class="tabular-nums">{{ round(verdict.actual) }}</span>
        <span class="opacity-70 tabular-nums">{{ gapLabel(verdict) }}</span>
      </span>
    </div>

    <p v-if="day.isImpossible && isOpen" class="mt-3 text-sm text-error">
      {{ $t('planner.day.impossibleHint') }}
    </p>
  </UCard>
</template>
