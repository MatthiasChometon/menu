import { describe, expect, it } from 'vitest';

const currentPlan = (): BatchPlan => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to plan');

  return useBatchPlan().planOf(latestMenu);
};

describe('useBatchPlan', () => {
  it('counts how many servings of each dish the week needs', () => {
    const plan = currentPlan();
    const { latestMenu } = useMenu();

    for (const task of plan.tasks) {
      const served = latestMenu?.days
        .flatMap((day): Meal[] => day.meals)
        .filter((meal): boolean => meal.recipe.id === task.recipe.id).length;

      expect(task.servings, task.recipe.id).toBe(served);
    }
  });

  it('adds up the week into one weighing per ingredient', () => {
    const plan = currentPlan();
    const { latestMenu } = useMenu();

    const chili = plan.tasks.find((task): boolean => task.recipe.id === 'chiliChicken');
    if (chili === undefined) throw new Error('chili not on the menu');

    const expected = latestMenu?.days
      .flatMap((day): Meal[] => day.meals)
      .filter((meal): boolean => meal.recipe.id === 'chiliChicken')
      .flatMap((meal): FoodQuantity[] => meal.quantities)
      .filter((quantity): boolean => quantity.food.id === 'chickenBreast')
      .reduce((total, quantity): number => total + quantity.grams, 0);

    const chicken = chili.quantities.find(
      (quantity): boolean => quantity.food.id === 'chickenBreast',
    );

    expect(chicken?.grams).toBe(Math.round(expected ?? 0));
  });

  it('lists each ingredient once per dish', () => {
    for (const task of currentPlan().tasks) {
      const ids = task.quantities.map((quantity): string => quantity.food.id);

      expect(new Set(ids).size, task.recipe.id).toBe(ids.length);
    }
  });

  it('puts the longest dishes first so their cooking starts early', () => {
    const minutes = currentPlan().tasks.map((task): number => task.minutes);

    expect([...minutes].sort((left, right): number => right - left)).toEqual(minutes);
  });

  it('keeps dishes that cannot be prepared ahead out of the batch', () => {
    const plan = currentPlan();

    expect(plan.tasks.every((task): boolean => task.recipe.batch)).toBe(true);
    expect(plan.freshTasks.every((task): boolean => !task.recipe.batch)).toBe(true);
  });

  it('announces the total cooking time of the batch', () => {
    const plan = currentPlan();
    const sum = plan.tasks.reduce((total, task): number => total + task.minutes, 0);

    expect(plan.totalMinutes).toBe(sum);
  });
});
