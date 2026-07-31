const mergeQuantities = (meals: Meal[]): FoodQuantity[] => {
  const byFood = new Map<string, FoodQuantity>();

  for (const meal of meals) {
    for (const { food, grams } of meal.quantities) {
      const existing = byFood.get(food.id);
      byFood.set(food.id, { food, grams: (existing?.grams ?? 0) + grams });
    }
  }

  return [...byFood.values()]
    .map(({ food, grams }): FoodQuantity => ({ food, grams: Math.round(grams) }))
    .sort((left, right): number => right.grams - left.grams);
};

export const useBatchPlan = (): { planOf: (menu: Menu) => BatchPlan } => ({
  // Sunday cooking needs the week's total per dish, not per meal: one pot of
  // chili for six servings, weighed once.
  planOf: (menu: Menu): BatchPlan => {
    const mealsByRecipe = new Map<string, Meal[]>();

    for (const day of menu.days) {
      for (const meal of day.meals) {
        mealsByRecipe.set(meal.recipe.id, [...(mealsByRecipe.get(meal.recipe.id) ?? []), meal]);
      }
    }

    const allTasks = [...mealsByRecipe.values()]
      .map((meals): BatchTask | undefined => {
        const recipe = meals[0]?.recipe;
        if (recipe === undefined) return undefined;

        return {
          recipe,
          servings: meals.length,
          quantities: mergeQuantities(meals),
          minutes: recipe.prepMinutes,
        };
      })
      .filter((task): task is BatchTask => task !== undefined)
      .sort((left, right): number => right.minutes - left.minutes);

    const tasks = allTasks.filter((task): boolean => task.recipe.batch);

    return {
      tasks,
      freshTasks: allTasks.filter((task): boolean => !task.recipe.batch),
      totalMinutes: tasks.reduce((total, task): number => total + task.minutes, 0),
    };
  },
});
