import { beforeEach, describe, expect, it } from 'vitest';

const menuOf = (): Menu => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu;
};

beforeEach((): void => {
  const menu = menuOf();
  useMealOverrides(menu.weekOf).reset();
  useMealSwap(menu.weekOf).reset();
  useLeftovers(menu.weekOf).reset();
});

describe('useFlexedWeek', () => {
  it('mirrors the plan when nothing has been overridden', () => {
    const menu = menuOf();
    const { days } = useFlexedWeek(menu);

    expect(days.value.map((day): number => day.meals.length)).toEqual(
      menu.days.map((day): number => day.meals.length),
    );
    expect(days.value[0]?.macros).toEqual(menu.days[0]?.macros);
    expect(days.value.every((day): boolean => day.meals.every((meal): boolean => !meal.flex.isSwapped))).toBe(
      true,
    );
  });

  it('drops an eaten-out meal from the day macros but still shows it', () => {
    const menu = menuOf();
    const day = menu.days[0];
    const meal = day?.meals[0];
    if (day === undefined || meal === undefined) throw new Error('the week has no meal');

    useMealOverrides(menu.weekOf).setEatingOut(day.key, meal.slot);

    const { days } = useFlexedWeek(menu);
    const flexedDay = days.value.find((entry): boolean => entry.key === day.key);
    const flexedMeal = flexedDay?.meals.find((entry): boolean => entry.slot === meal.slot);

    expect(flexedMeal?.flex.excludedAs).toBe('eatingOut');
    expect(flexedDay?.meals).toHaveLength(day.meals.length);
    expect(flexedDay?.macros.kcal).toBeCloseTo(day.macros.kcal - meal.macros.kcal);
  });

  it('drops an excluded meal entirely from the menu fed to adherence', () => {
    const menu = menuOf();
    const day = menu.days[0];
    const meal = day?.meals[0];
    if (day === undefined || meal === undefined) throw new Error('the week has no meal');

    useMealOverrides(menu.weekOf).setCheatMeal(day.key, meal.slot);

    const { adherenceMenu } = useFlexedWeek(menu);
    const adherenceDay = adherenceMenu.value?.days.find((entry): boolean => entry.key === day.key);

    expect(adherenceDay?.meals.some((entry): boolean => entry.slot === meal.slot)).toBe(false);
    expect(adherenceDay?.meals).toHaveLength(day.meals.length - 1);
  });

  it('swaps the content of two days', () => {
    const menu = menuOf();
    const dayA = menu.days[0];
    const dayB = menu.days[1];
    if (dayA === undefined || dayB === undefined) throw new Error('the week needs two days');

    const slots: MealSlot[] = dayA.meals.map((meal): MealSlot => meal.slot);
    useMealSwap(menu.weekOf).swapDay(dayA.key, dayB.key, slots);

    const { days } = useFlexedWeek(menu);
    const flexedA = days.value.find((entry): boolean => entry.key === dayA.key);

    for (const meal of dayB.meals) {
      const shown = flexedA?.meals.find((entry): boolean => entry.slot === meal.slot);
      expect(shown?.recipe.id).toBe(meal.recipe.id);
      expect(shown?.flex.isSwapped).toBe(true);
    }
  });

  it('offers yesterday leftovers as a suggestion, without changing today yet', () => {
    const menu = menuOf();
    const yesterday = menu.days[0];
    const today = menu.days[1];
    const meal = yesterday?.meals[0];
    if (yesterday === undefined || today === undefined || meal === undefined) {
      throw new Error('the week needs two days with a meal');
    }

    useLeftovers(menu.weekOf).markLeftover(yesterday.key, meal.slot);

    const { days } = useFlexedWeek(menu);
    const flexedToday = days.value.find((entry): boolean => entry.key === today.key);
    const suggestedMeal = flexedToday?.meals.find((entry): boolean => entry.slot === meal.slot);

    expect(suggestedMeal?.flex.suggestedLeftover?.recipe.id).toBe(meal.recipe.id);
    expect(suggestedMeal?.flex.isLeftover).toBe(false);
    expect(suggestedMeal?.recipe.id).not.toBe(undefined);
  });

  it('uses yesterday leftovers once accepted, recomputing the day macros', () => {
    const menu = menuOf();
    const yesterday = menu.days[0];
    const today = menu.days[1];
    const meal = yesterday?.meals[0];
    const plannedToday = today?.meals.find((entry): boolean => entry.slot === meal?.slot);
    if (yesterday === undefined || today === undefined || meal === undefined || plannedToday === undefined) {
      throw new Error('the week needs two days sharing a slot');
    }

    useLeftovers(menu.weekOf).markLeftover(yesterday.key, meal.slot);
    useLeftovers(menu.weekOf).useLeftoverHere(today.key, meal.slot);

    const { days } = useFlexedWeek(menu);
    const flexedToday = days.value.find((entry): boolean => entry.key === today.key);
    const usedMeal = flexedToday?.meals.find((entry): boolean => entry.slot === meal.slot);

    expect(usedMeal?.flex.isLeftover).toBe(true);
    expect(usedMeal?.recipe.id).toBe(meal.recipe.id);
    expect(flexedToday?.macros.kcal).toBeCloseTo(
      today.macros.kcal - plannedToday.macros.kcal + meal.macros.kcal,
    );
  });

  it('sends a dish leftovers to a slot chosen on purpose, further out than the next day', () => {
    const menu = menuOf();
    const origin = menu.days[0];
    const target = menu.days[2];
    const meal = origin?.meals[0];
    const plannedTarget = target?.meals.find((entry): boolean => entry.slot === meal?.slot);
    if (origin === undefined || target === undefined || meal === undefined || plannedTarget === undefined) {
      throw new Error('the week needs three days sharing a slot');
    }

    useLeftovers(menu.weekOf).assignLeftover(origin.key, meal.slot, target.key, meal.slot);

    const { days } = useFlexedWeek(menu);
    const flexedTarget = days.value.find((entry): boolean => entry.key === target.key);
    const usedMeal = flexedTarget?.meals.find((entry): boolean => entry.slot === meal.slot);

    expect(usedMeal?.flex.isLeftover).toBe(true);
    expect(usedMeal?.recipe.id).toBe(meal.recipe.id);
    expect(flexedTarget?.macros.kcal).toBeCloseTo(
      target.macros.kcal - plannedTarget.macros.kcal + meal.macros.kcal,
    );
  });

  it('lets a slot chosen on purpose win over the plain next-day nudge', () => {
    const menu = menuOf();
    const yesterday = menu.days[0];
    const chosenOrigin = menu.days[1];
    const today = menu.days[2];
    const slot = yesterday?.meals[0]?.slot;
    if (yesterday === undefined || chosenOrigin === undefined || today === undefined || slot === undefined) {
      throw new Error('the week needs three days sharing a slot');
    }

    useLeftovers(menu.weekOf).markLeftover(chosenOrigin.key, slot);
    useLeftovers(menu.weekOf).useLeftoverHere(today.key, slot);
    useLeftovers(menu.weekOf).assignLeftover(yesterday.key, slot, today.key, slot);

    const { days } = useFlexedWeek(menu);
    const flexedToday = days.value.find((entry): boolean => entry.key === today.key);
    const usedMeal = flexedToday?.meals.find((entry): boolean => entry.slot === slot);

    expect(usedMeal?.recipe.id).toBe(yesterday.meals[0]?.recipe.id);
  });

  it('drops a leftover-covered meal from the shopping list, without touching the rest', () => {
    const menu = menuOf();
    const origin = menu.days[0];
    const target = menu.days[1];
    const meal = origin?.meals[0];
    if (origin === undefined || target === undefined || meal === undefined) {
      throw new Error('the week needs two days sharing a slot');
    }

    useLeftovers(menu.weekOf).assignLeftover(origin.key, meal.slot, target.key, meal.slot);

    const { shoppingMenu } = useFlexedWeek(menu);

    expect(shoppingMenu.value?.totalPrice).toBeLessThan(menu.totalPrice);

    // Only the covered slot's own grammes drop out: no other meal loses so
    // much as a gram it was not the one to lose.
    const otherMeals = menu.days.flatMap((day): Meal[] =>
      day.meals.filter((entry): boolean => !(day.key === target.key && entry.slot === meal.slot)),
    );
    const flexedOtherMeals = (shoppingMenu.value?.days ?? []).flatMap((day): Meal[] =>
      day.meals.filter((entry): boolean => !(day.key === target.key && entry.slot === meal.slot)),
    );
    expect(flexedOtherMeals.map((entry): number => entry.quantities.length)).toEqual(
      otherMeals.map((entry): number => entry.quantities.length),
    );
  });
});
