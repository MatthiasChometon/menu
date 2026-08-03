const signatureOf = (quantities: FoodQuantity[]): string =>
  quantities
    .map(({ food, grams }): string => `${food.id}:${grams}`)
    .sort()
    .join('|');

export const useRecipeVariants = (): {
  variantsOf: (menu: Menu, recipeId: string) => RecipeVariant[];
} => ({
  // A recipe shows up several times in a week with different weights (full
  // portion at lunch, smaller one at dinner). Grouping by exact weights gives
  // the distinct portions worth displaying.
  variantsOf: (menu: Menu, recipeId: string): RecipeVariant[] => {
    const groups = new Map<string, RecipeVariant>();

    for (const day of menu.days) {
      for (const meal of day.meals) {
        if (meal.recipe.id !== recipeId) continue;

        const id = signatureOf(meal.quantities);
        const existing = groups.get(id);

        if (existing === undefined) {
          groups.set(id, {
            id,
            isReduced: meal.portionRatio < 0.85,
            quantities: meal.quantities,
            macros: meal.macros,
            servings: [{ day: day.key, slot: meal.slot }],
          });
          continue;
        }

        existing.servings.push({ day: day.key, slot: meal.slot });
      }
    }

    return [...groups.values()].sort((left, right): number => right.macros.kcal - left.macros.kcal);
  },
});
