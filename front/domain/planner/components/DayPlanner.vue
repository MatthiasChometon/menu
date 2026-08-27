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
const { recipesFor, chosen, choose, clearDay, applySwap, swapsForMacro } = usePlanner();
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

// Which macro the reader asked about. Naming one is what turns "fibres -33 %"
// from a verdict into a question with an answer.
const openMacro = ref<keyof Macros | undefined>(undefined);

const fixes = computed((): MacroSwap[] =>
  openMacro.value === undefined ? [] : swapsForMacro(day, openMacro.value),
);

const askAbout = (verdict: MacroVerdict): void => {
  openMacro.value = openMacro.value === verdict.macro ? undefined : verdict.macro;
};

// Signed, because a macro can be over as easily as under.
const gainLabel = (gain: number): string => `${gain > 0 ? '+' : ''}${Math.round(gain)}`;

const takeFix = (fix: MacroSwap): void => {
  applySwap(fix.swap);
  openMacro.value = undefined;
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
        class="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
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
        <!-- Neither the verdict nor the figure breaks across lines: "dans les
             cibles" split over two rows on the longest day name, which made
             Sunday's card taller than the six above it for no reason a reader
             could see. If the row runs out of width, whole pieces move down. -->
        <UBadge :color="statusColor" variant="subtle" size="sm" class="whitespace-nowrap">
          {{ statusLabel }}
        </UBadge>
        <span v-if="!isEmpty" class="ml-auto whitespace-nowrap text-sm tabular-nums text-muted">
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
      <component
        :is="verdict.isWithinTolerance ? 'span' : 'button'"
        v-for="verdict in steered"
        :key="verdict.macro"
        :type="verdict.isWithinTolerance ? undefined : 'button'"
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors"
        :class="
          verdict.isWithinTolerance
            ? 'bg-primary/10 text-primary'
            : 'bg-error/10 text-error font-semibold cursor-pointer hover:bg-error/20'
        "
        :aria-expanded="verdict.isWithinTolerance ? undefined : openMacro === verdict.macro"
        @click="verdict.isWithinTolerance ? undefined : askAbout(verdict)"
      >
        <span>{{ $t(`menu.macroShort.${verdict.macro}`) }}</span>
        <span class="tabular-nums">{{ round(verdict.actual) }}</span>
        <span class="opacity-70 tabular-nums">{{ gapLabel(verdict) }}</span>
        <UIcon
          v-if="!verdict.isWithinTolerance"
          name="i-lucide-circle-help"
          class="size-3.5 shrink-0"
        />
      </component>
    </div>

    <!-- The answer to the macro that was clicked: which meal to change, what to
         put in its place, and how much of that macro it actually brings. Three
         options rather than one, because being handed a single verdict is what
         made the number feel like a wall. -->
    <div
      v-if="openMacro !== undefined"
      class="mt-3 rounded-xl border border-default bg-elevated/40 p-3"
    >
      <p class="text-sm font-semibold">
        {{ $t('planner.fix.title') }}
        <span class="text-muted">{{ $t(`menu.macro.${openMacro}`) }}</span>
      </p>

      <p v-if="fixes.length === 0" class="mt-2 text-sm text-muted">{{ $t('planner.fix.none') }}</p>

      <ul v-else class="mt-2 space-y-2">
        <li
          v-for="fix in fixes"
          :key="`${fix.swap.slot}-${fix.swap.to.id}`"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-default px-3 py-2"
        >
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ $t(`menu.meal.${fix.swap.slot}`) }}
          </UBadge>
          <span class="min-w-0 flex-1 text-sm font-medium">{{ nameOf(fix.swap.to) }}</span>
          <UBadge color="primary" variant="subtle" size="sm" class="tabular-nums">
            {{ gainLabel(fix.gain) }} {{ $t('menu.unit.gram') }}
          </UBadge>
          <UBadge v-if="fix.becomesValid" color="primary" variant="soft" size="sm">
            {{ $t('planner.fix.fixes') }}
          </UBadge>
          <UButton size="xs" variant="soft" @click="takeFix(fix)">
            {{ $t('planner.fix.choose') }}
          </UButton>
        </li>
      </ul>
    </div>

    <p v-if="day.isImpossible && isOpen" class="mt-3 text-sm text-error">
      {{ $t('planner.day.impossibleHint') }}
    </p>
  </UCard>
</template>
