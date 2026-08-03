import { describe, expect, it } from 'vitest';

describe('useMenu', () => {
  it('exposes the most recent week as the current menu', () => {
    const { menus, currentMenu } = useMenu();

    expect(menus.length).toBeGreaterThan(0);
    expect(currentMenu?.weekOf).toBe(menus[0]?.weekOf);
  });

  it('builds the seven days in calendar order', () => {
    const { currentMenu } = useMenu();

    expect(currentMenu?.days.map((day): DayKey => day.key)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
  });

  it('orders the meals of a day the way they are eaten', () => {
    const { currentMenu } = useMenu();

    expect(currentMenu?.days[0]?.meals.map((meal): MealSlot => meal.slot)).toEqual([
      'breakfast',
      'postWorkout',
      'lunch',
      'snack',
      'dinner',
    ]);
  });

  it('keeps every day within a tenth of the calorie target', () => {
    const { currentMenu } = useMenu();
    if (currentMenu === undefined) throw new Error('no menu to check');

    for (const day of currentMenu.days) {
      const gap = Math.abs(day.macros.kcal - currentMenu.targets.kcal) / currentMenu.targets.kcal;
      expect(gap, `${day.key} drifts from the calorie target`).toBeLessThan(0.1);
    }
  });

  it('marks an evening serving as a smaller portion than its reference recipe', () => {
    const { currentMenu } = useMenu();
    const dinner = currentMenu?.days[0]?.meals.find((meal): boolean => meal.slot === 'dinner');

    expect(dinner?.portionRatio).toBeLessThan(0.85);
  });

  it('merges the same food across the week into one shopping line', () => {
    const { currentMenu } = useMenu();
    if (currentMenu === undefined) throw new Error('no menu to check');

    const ids = currentMenu.shoppingList.map((line): string => line.food.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('totals the shopping list into the announced price', () => {
    const { currentMenu } = useMenu();
    if (currentMenu === undefined) throw new Error('no menu to check');

    const sum = currentMenu.shoppingList.reduce((total, line): number => total + line.price, 0);

    expect(currentMenu.totalPrice).toBeCloseTo(sum);
  });

  it('lists only the recipes actually served that week', () => {
    const { currentMenu } = useMenu();
    if (currentMenu === undefined) throw new Error('no menu to check');

    const served = new Set(
      currentMenu.days.flatMap((day): string[] => day.meals.map((meal): string => meal.recipe.id)),
    );

    expect(new Set(currentMenu.recipes.map((recipe): string => recipe.id))).toEqual(served);
  });
});
