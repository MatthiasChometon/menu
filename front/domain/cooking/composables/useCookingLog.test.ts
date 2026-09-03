import { beforeEach, describe, expect, it } from 'vitest';

const menuOf = (): Menu => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu;
};

const logOf = (): ReturnType<typeof useCookingLog> => useCookingLog(menuOf().weekOf);

// The diary lives in localStorage, which is shared across tests in a file.
beforeEach((): void => {
  logOf().reset();
});

describe('useCookingLog', () => {
  it('starts with everything still to cook', () => {
    const { statusOf } = logOf();

    expect(statusOf('teriyakiSalmonBowl')).toBe('todo');
  });

  it('remembers a dish being cooked', () => {
    const { setStatus, statusOf } = logOf();

    setStatus('teriyakiSalmonBowl', 'done');

    expect(statusOf('teriyakiSalmonBowl')).toBe('done');
  });

  it('counts every serving the week asks of a dish', () => {
    const menu = menuOf();
    const { servingsOf } = logOf();

    const served = menu.days.reduce(
      (total, day): number =>
        total + day.meals.filter((meal): boolean => meal.recipe.id === 'teriyakiSalmonBowl').length,
      0,
    );

    expect(servingsOf(menu, 'teriyakiSalmonBowl')).toBe(served);
  });

  it('holds nothing in the fridge until the dish is actually cooked', () => {
    const menu = menuOf();
    const { progressOf } = logOf();

    const chili = progressOf(menu).find((entry): boolean => entry.recipe.id === 'teriyakiSalmonBowl');

    expect(chili?.servings).toBeGreaterThan(0);
    expect(chili?.left).toBe(0);
  });

  it('fills the fridge with every portion once the dish is cooked', () => {
    const menu = menuOf();
    const { setStatus, progressOf, servingsOf } = logOf();

    setStatus('teriyakiSalmonBowl', 'done');
    const chili = progressOf(menu).find((entry): boolean => entry.recipe.id === 'teriyakiSalmonBowl');

    expect(chili?.left).toBe(servingsOf(menu, 'teriyakiSalmonBowl'));
  });

  it('takes a portion out of the fridge when a meal is eaten', () => {
    const menu = menuOf();
    const { setStatus, toggleEaten, progressOf, servingsOf } = logOf();

    const served = menu.days.flatMap((day): { day: DayKey; slot: MealSlot }[] =>
      day.meals
        .filter((meal): boolean => meal.recipe.id === 'teriyakiSalmonBowl')
        .map((meal): { day: DayKey; slot: MealSlot } => ({ day: day.key, slot: meal.slot })),
    );
    const first = served[0];
    if (first === undefined) throw new Error('the week never serves the chili');

    setStatus('teriyakiSalmonBowl', 'done');
    toggleEaten(first.day, first.slot);

    const chili = progressOf(menu).find((entry): boolean => entry.recipe.id === 'teriyakiSalmonBowl');

    expect(chili?.left).toBe(servingsOf(menu, 'teriyakiSalmonBowl') - 1);
  });

  it('puts the portion back when a meal is un-ticked', () => {
    const menu = menuOf();
    const { setStatus, toggleEaten, progressOf, servingsOf } = logOf();
    const day = menu.days[0];
    const meal = day?.meals[0];
    if (day === undefined || meal === undefined) throw new Error('the week has no meal');

    setStatus(meal.recipe.id, 'done');
    toggleEaten(day.key, meal.slot);
    toggleEaten(day.key, meal.slot);

    const dish = progressOf(menu).find((entry): boolean => entry.recipe.id === meal.recipe.id);

    expect(dish?.left).toBe(servingsOf(menu, meal.recipe.id));
  });

  it('never lets the fridge go negative', () => {
    const menu = menuOf();
    const { setStatus, toggleEaten, progressOf } = logOf();

    setStatus('teriyakiSalmonBowl', 'done');
    for (const day of menu.days) {
      for (const meal of day.meals) {
        if (meal.recipe.id === 'teriyakiSalmonBowl') toggleEaten(day.key, meal.slot);
      }
    }

    const chili = progressOf(menu).find((entry): boolean => entry.recipe.id === 'teriyakiSalmonBowl');

    expect(chili?.left).toBe(0);
  });

  it('forgets everything when the week is started over', () => {
    const { setStatus, reset, statusOf } = logOf();

    setStatus('teriyakiSalmonBowl', 'skipped');
    reset();

    expect(statusOf('teriyakiSalmonBowl')).toBe('todo');
  });
});
