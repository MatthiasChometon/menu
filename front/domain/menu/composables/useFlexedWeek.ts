import { sumMacros } from '../utils/nutrition';

const mealAt = (days: Day[], day: DayKey, slot: MealSlot): Meal | undefined =>
  days.find((entry): boolean => entry.key === day)?.meals.find((meal): boolean => meal.slot === slot);

// Built on top of the plan, never inside it: the composed week and the demo
// week stay exactly what was planned. What actually happens — a meal skipped,
// two days traded, yesterday's pot reused — lives here, layered onto a read of
// the plan the same way the cooking diary layers onto it (useCookingLog), so
// undoing every override always lands back on the plan as composed.
export const useFlexedWeek = (
  menu: MaybeRefOrGetter<Menu | undefined>,
): {
  days: ComputedRef<FlexedDay[]>;
  /** The same days, with excluded meals dropped rather than dimmed — what
   *  useAdherence should count against, so a meal eaten out or a cheat day
   *  never reads as a meal missed. */
  adherenceMenu: ComputedRef<Menu | undefined>;
} => {
  const weekOf = computed((): string => toValue(menu)?.weekOf ?? '');
  const { kindOf } = useMealOverrides(weekOf);
  const { sourceOf } = useMealSwap(weekOf);
  const { hasLeftover, decisionAt } = useLeftovers(weekOf);

  const flexedMealAt = (
    days: Day[],
    day: DayKey,
    slot: MealSlot,
    previous: Day | undefined,
  ): FlexedMeal | undefined => {
    const source = sourceOf(day, slot);
    const swapped = mealAt(days, source.day, source.slot);
    if (swapped === undefined) return undefined;

    const decision = decisionAt(day, slot);
    const leftover =
      decision === 'used' && previous !== undefined ? mealAt(days, previous.key, slot) : undefined;

    const suggestedLeftover =
      decision === undefined && previous !== undefined && hasLeftover(previous.key, slot)
        ? mealAt(days, previous.key, slot)
        : undefined;

    return {
      ...(leftover ?? swapped),
      flex: {
        excludedAs: kindOf(day, slot),
        isSwapped: source.day !== day || source.slot !== slot,
        isLeftover: leftover !== undefined,
        suggestedLeftover,
      },
    };
  };

  const days = computed((): FlexedDay[] => {
    const rawDays = toValue(menu)?.days ?? [];

    return rawDays.map((day, index): FlexedDay => {
      const previous = rawDays[index - 1];
      const meals = day.meals
        .map((meal): FlexedMeal | undefined => flexedMealAt(rawDays, day.key, meal.slot, previous))
        .filter((meal): meal is FlexedMeal => meal !== undefined);

      const counted = meals.filter((meal): boolean => meal.flex.excludedAs === undefined);

      return { key: day.key, meals, macros: sumMacros(counted.map((meal): Macros => meal.macros)) };
    });
  });

  return {
    days,
    adherenceMenu: computed((): Menu | undefined => {
      const base = toValue(menu);
      if (base === undefined) return undefined;

      return {
        ...base,
        days: days.value.map(
          (day): Day => ({
            key: day.key,
            macros: day.macros,
            meals: day.meals.filter((meal): boolean => meal.flex.excludedAs === undefined),
          }),
        ),
      };
    }),
  };
};
