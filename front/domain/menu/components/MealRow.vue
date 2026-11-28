<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const {
  meal,
  dayKey,
  leftoverTargets = [],
} = defineProps<{
  meal: FlexedMeal;
  dayKey: DayKey;
  /** Later days sharing this slot, free to be sent this dish's leftovers. */
  leftoverTargets?: DayKey[];
}>();

const { imageOf } = useRecipes();
const { nameOf, round } = useFoodFormat();
const { selectedWeek } = useSelectedWeek();
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;
const { dayLabel, mealLabel, mealTimeLabel } = useMenuLabels();

const { statusOf, isEaten, toggleEaten } = useCookingLog(selectedWeek);
const { setEatingOut, setCheatMeal, clearOverride } = useMealOverrides(selectedWeek);
const {
  hasLeftover,
  markLeftover,
  clearLeftover,
  useLeftoverHere,
  declineLeftover,
  clearDecision,
  assignedOriginOf,
  assignedTargetOf,
  assignLeftover,
  clearAssignment,
} = useLeftovers(selectedWeek);

const isReduced = computed((): boolean => meal.portionRatio < 0.85);

const eaten = computed((): boolean => isEaten(dayKey, meal.slot));

// Ready means the pot exists: the dish was cooked, so this meal is a matter of
// opening the fridge rather than starting a recipe.
const isReady = computed((): boolean => statusOf(meal.recipe.id) === 'done');

const isExcluded = computed((): boolean => meal.flex.excludedAs !== undefined);

// A leftover standing here can come from the plain next-day nudge or from a
// slot chosen on purpose; stopping it means undoing whichever one it was.
const stopLeftover = (): void => {
  if (assignedOriginOf(dayKey, meal.slot) !== undefined) clearAssignment(dayKey, meal.slot);
  else clearDecision(dayKey, meal.slot);
};

const leftoverItem = computed((): DropdownMenuItem =>
  meal.flex.isLeftover
    ? {
        label: t('menu.flex.leftover.stop'),
        icon: 'i-lucide-rotate-ccw',
        onSelect: stopLeftover,
      }
    : hasLeftover(dayKey, meal.slot)
      ? {
          label: t('menu.flex.leftover.cancel'),
          icon: 'i-lucide-package-x',
          onSelect: (): void => clearLeftover(dayKey, meal.slot),
        }
      : {
          label: t('menu.flex.leftover.mark'),
          icon: 'i-lucide-package',
          onSelect: (): void => markLeftover(dayKey, meal.slot),
        },
);

// This dish's own leftovers, sent to a slot picked on purpose: already
// reserved somewhere, offered to cancel; otherwise offered to every
// compatible slot still ahead of it.
const leftoverAssignmentItems = computed((): DropdownMenuItem[] => {
  const reservedFor = assignedTargetOf(dayKey, meal.slot);
  if (reservedFor !== undefined) {
    return [
      {
        label: `${t('menu.flex.leftover.reservedFor')} ${dayLabel(reservedFor.day)}`,
        icon: 'i-lucide-package-check',
        onSelect: (): void => clearAssignment(reservedFor.day, reservedFor.slot),
      },
    ];
  }

  return leftoverTargets.map((targetDay): DropdownMenuItem => ({
    label: `${t('menu.flex.leftover.keepFor')} ${dayLabel(targetDay)}`,
    icon: 'i-lucide-package-plus',
    onSelect: (): void => assignLeftover(dayKey, meal.slot, targetDay, meal.slot),
  }));
});

const menuItems = computed((): DropdownMenuItem[][] => {
  if (isExcluded.value) {
    return [
      [
        {
          label: t('menu.flex.override.undo'),
          icon: 'i-lucide-rotate-ccw',
          onSelect: (): void => clearOverride(dayKey, meal.slot),
        },
      ],
    ];
  }

  return [
    [
      {
        label: t('menu.flex.override.eatingOut'),
        icon: 'i-lucide-utensils-crossed',
        onSelect: (): void => setEatingOut(dayKey, meal.slot),
      },
      {
        label: t('menu.flex.override.cheatMeal'),
        icon: 'i-lucide-cookie',
        onSelect: (): void => setCheatMeal(dayKey, meal.slot),
      },
    ],
    [leftoverItem.value],
    ...(leftoverAssignmentItems.value.length > 0 ? [leftoverAssignmentItems.value] : []),
  ];
});
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      class="group flex items-center gap-1 rounded-2xl pr-2 transition-colors"
      :class="eaten || isExcluded ? 'opacity-60' : 'hover:bg-elevated/60'"
    >
      <NuxtLink
        :to="localePath(`/recette/${meal.recipe.id}`)"
        class="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 focus-visible:bg-elevated/60"
      >
        <div class="size-16 shrink-0 overflow-hidden rounded-xl">
          <UiThumb
            :src="imageOf(meal.recipe)"
            :alt="nameOf(meal.recipe)"
            icon="i-lucide-cooking-pot"
            class="transform-gpu transition-transform duration-500 will-change-transform group-hover:scale-105"
          />
        </div>

        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span class="font-medium text-primary">{{ mealLabel(meal.slot) }}</span>
            <span class="text-dimmed">{{ mealTimeLabel(meal.slot) }}</span>
          </p>
          <p class="truncate font-medium" :class="(eaten || isExcluded) && 'line-through'">
            {{ nameOf(meal.recipe) }}
          </p>
          <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span class="tabular-nums">
              {{ round(meal.macros.kcal) }} {{ $t('menu.unit.kcal') }}
            </span>
            <span class="text-dimmed">·</span>
            <span class="tabular-nums">
              {{ round(meal.macros.protein) }} {{ $t('menu.unit.gram') }}
              {{ $t('menu.macroShort.protein') }}
            </span>
            <UiPlainBadge v-if="isReduced" color="neutral">
              {{ $t('menu.portionReduced') }}
            </UiPlainBadge>
            <!-- Only worth saying before the meal is eaten: afterwards the fridge
                 no longer holds this portion. -->
            <UiPlainBadge v-if="isReady && !eaten" color="primary">
              {{ $t('cooking.inTheFridge') }}
            </UiPlainBadge>
            <UiPlainBadge v-if="meal.flex.excludedAs === 'eatingOut'" color="neutral">
              {{ $t('menu.flex.override.eatingOutBadge') }}
            </UiPlainBadge>
            <UiPlainBadge v-if="meal.flex.excludedAs === 'cheatMeal'" color="warning">
              {{ $t('menu.flex.override.cheatMealBadge') }}
            </UiPlainBadge>
            <UiPlainBadge v-if="meal.flex.isLeftover" color="primary">
              {{ $t('menu.flex.leftover.badge') }}
            </UiPlainBadge>
            <UiPlainBadge v-if="meal.flex.isSwapped" color="neutral">
              {{ $t('menu.flex.swap.badge') }}
            </UiPlainBadge>
          </p>
        </div>
      </NuxtLink>

      <!-- Outside the link on purpose: a button nested in an anchor is invalid,
           and tapping "eaten" must never navigate to the recipe. -->
      <UiPlainButton
        v-if="!isExcluded"
        :color="eaten ? 'primary' : 'neutral'"
        :variant="eaten ? 'soft' : 'ghost'"
        size="sm"
        square
        class="shrink-0"
        :aria-pressed="eaten"
        :aria-label="eaten ? $t('cooking.markNotEaten') : $t('cooking.markEaten')"
        @click="toggleEaten(dayKey, meal.slot)"
      >
        <UIcon :name="eaten ? 'i-lucide-check-check' : 'i-lucide-check'" class="size-4 shrink-0" />
      </UiPlainButton>

      <UiActionsMenu :items="menuItems" :label="$t('menu.flex.mealActions')" />
    </div>

    <!-- A pot from yesterday, offered rather than imposed: the plan for this
         slot stands until the reader actually picks the leftovers instead. -->
    <div
      v-if="meal.flex.suggestedLeftover !== undefined"
      class="mx-2 flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs"
    >
      <UIcon name="i-lucide-utensils" class="size-4 shrink-0 text-primary" />
      <span class="flex-1 text-muted">
        {{ $t('menu.flex.leftover.suggestion') }}
        <span class="font-medium text-default">{{
          nameOf(meal.flex.suggestedLeftover.recipe)
        }}</span>
      </span>
      <UiPlainButton
        size="xs"
        color="primary"
        variant="soft"
        @click="useLeftoverHere(dayKey, meal.slot)"
      >
        {{ $t('menu.flex.leftover.accept') }}
      </UiPlainButton>
      <UiPlainButton
        size="xs"
        color="neutral"
        variant="ghost"
        @click="declineLeftover(dayKey, meal.slot)"
      >
        {{ $t('menu.flex.leftover.decline') }}
      </UiPlainButton>
    </div>
  </div>
</template>
