import { buildShoppingList } from '../utils/menu';
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
  /** The same days again, but a slot standing in for a reused pot buys
   *  nothing new — what the shopping list should be built from, so a leftover
   *  never turns into a second purchase. */
  shoppingMenu: ComputedRef<Menu | undefined>;
} => {
  const weekOf = computed((): string => toValue(menu)?.weekOf ?? '');
  const { kindOf } = useMealOverrides(weekOf);
  const { sourceOf } = useMealSwap(weekOf);
  const { hasLeftover, decisionAt, assignedOriginOf } = useLeftovers(weekOf);

  // A slot chosen on purpose always wins over the plain next-day nudge: it was
  // picked deliberately, however far out, while the nudge only ever guesses at
  // the day right before.
  const leftoverAt = (
    days: Day[],
    day: DayKey,
    slot: MealSlot,
    previous: Day | undefined,
  ): Meal | undefined => {
    const assignedOrigin = assignedOriginOf(day, slot);
    if (assignedOrigin !== undefined) return mealAt(days, assignedOrigin.day, assignedOrigin.slot);

    if (previous === undefined || decisionAt(day, slot) !== 'used') return undefined;
    return mealAt(days, previous.key, slot);
  };

  // The nudge only makes sense while nothing has been decided about this slot
  // yet, and never alongside a leftover already standing here on purpose.
  const suggestedLeftoverAt = (
    days: Day[],
    day: DayKey,
    slot: MealSlot,
    previous: Day | undefined,
    isAlreadyLeftover: boolean,
  ): Meal | undefined => {
    if (isAlreadyLeftover || previous === undefined) return undefined;
    if (decisionAt(day, slot) !== undefined || !hasLeftover(previous.key, slot)) return undefined;
    return mealAt(days, previous.key, slot);
  };

  const flexedMealAt = (
    days: Day[],
    day: DayKey,
    slot: MealSlot,
    previous: Day | undefined,
  ): FlexedMeal | undefined => {
    const source = sourceOf(day, slot);
    const swapped = mealAt(days, source.day, source.slot);
    if (swapped === undefined) return undefined;

    const leftover = leftoverAt(days, day, slot, previous);

    return {
      ...(leftover ?? swapped),
      flex: {
        excludedAs: kindOf(day, slot),
        isSwapped: source.day !== day || source.slot !== slot,
        isLeftover: leftover !== undefined,
        suggestedLeftover: suggestedLeftoverAt(days, day, slot, previous, leftover !== undefined),
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

  // A reused pot keeps the macros it was cooked with, but nothing left to buy:
  // whatever it stands in for was already bought the day it was actually
  // cooked, so its grammes drop out here rather than being counted twice.
  const shoppingDaysOf = (flexedDays: FlexedDay[]): Day[] =>
    flexedDays.map((day): Day => ({
      key: day.key,
      macros: day.macros,
      meals: day.meals.map(
        (meal): Meal => ({
          slot: meal.slot,
          recipe: meal.recipe,
          macros: meal.macros,
          portionRatio: meal.portionRatio,
          quantities: meal.flex.isLeftover ? [] : meal.quantities,
        }),
      ),
    }));

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
    shoppingMenu: computed((): Menu | undefined => {
      const base = toValue(menu);
      if (base === undefined) return undefined;

      const shoppingDays = shoppingDaysOf(days.value);
      const shoppingList = buildShoppingList(shoppingDays);

      return {
        ...base,
        days: shoppingDays,
        shoppingList,
        totalPrice: shoppingList.reduce((total, line): number => total + line.price, 0),
      };
    }),
  };
};
