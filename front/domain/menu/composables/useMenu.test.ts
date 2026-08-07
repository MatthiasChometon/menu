import { describe, expect, it } from 'vitest';

describe('useMenu', () => {
  it('exposes the most recent week as the current menu', () => {
    const { menus, latestMenu } = useMenu();

    expect(menus.length).toBeGreaterThan(0);
    expect(latestMenu?.weekOf).toBe(menus[0]?.weekOf);
  });

  it('builds the seven days in calendar order', () => {
    const { latestMenu } = useMenu();

    expect(latestMenu?.days.map((day): DayKey => day.key)).toEqual([
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
    const { latestMenu } = useMenu();

    expect(latestMenu?.days[0]?.meals.map((meal): MealSlot => meal.slot)).toEqual([
      'breakfast',
      'postWorkout',
      'lunch',
      'snack',
      'dinner',
    ]);
  });

  it('keeps every day within a tenth of the calorie target', () => {
    const { latestMenu } = useMenu();
    if (latestMenu === undefined) throw new Error('no menu to check');

    for (const day of latestMenu.days) {
      const gap = Math.abs(day.macros.kcal - latestMenu.targets.kcal) / latestMenu.targets.kcal;
      expect(gap, `${day.key} drifts from the calorie target`).toBeLessThan(0.1);
    }
  });

  it('marks an evening serving as a smaller portion than its reference recipe', () => {
    const { latestMenu } = useMenu();
    const dinner = latestMenu?.days[0]?.meals.find((meal): boolean => meal.slot === 'dinner');

    expect(dinner?.portionRatio).toBeLessThan(0.85);
  });

  it('merges the same food across the week into one shopping line', () => {
    const { latestMenu } = useMenu();
    if (latestMenu === undefined) throw new Error('no menu to check');

    const ids = latestMenu.shoppingList.map((line): string => line.food.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('totals the shopping list into the announced price', () => {
    const { latestMenu } = useMenu();
    if (latestMenu === undefined) throw new Error('no menu to check');

    const sum = latestMenu.shoppingList.reduce((total, line): number => total + line.price, 0);

    expect(latestMenu.totalPrice).toBeCloseTo(sum);
  });

  it('lists only the recipes actually served that week', () => {
    const { latestMenu } = useMenu();
    if (latestMenu === undefined) throw new Error('no menu to check');

    const served = new Set(
      latestMenu.days.flatMap((day): string[] => day.meals.map((meal): string => meal.recipe.id)),
    );

    expect(new Set(latestMenu.recipes.map((recipe): string => recipe.id))).toEqual(served);
  });
});
