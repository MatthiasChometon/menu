const signatureOf = (quantities: FoodQuantity[]): string =>
  quantities
    .map(({ food, grams }): string => `${food.id}:${grams}`)
    .sort()
    .join('|');

export const useRecipeVariants = (): {
  variantsOf: (menu: Menu, recipeId: string) => RecipeVariant[];
  portionsOf: (variants: RecipeVariant[]) => number;
  weekQuantitiesOf: (variants: RecipeVariant[]) => FoodQuantity[];
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

  portionsOf: (variants: RecipeVariant[]): number =>
    variants.reduce((total, variant): number => total + variant.servings.length, 0),

  // Everything the week needs of this recipe, cooked in one go: each portion
  // counted as many times as it is served, the reduced ones included.
  weekQuantitiesOf: (variants: RecipeVariant[]): FoodQuantity[] => {
    const totals = new Map<string, FoodQuantity>();

    for (const variant of variants) {
      for (const { food, grams } of variant.quantities) {
        const existing = totals.get(food.id);
        totals.set(food.id, {
          food,
          grams: (existing?.grams ?? 0) + grams * variant.servings.length,
        });
      }
    }

    return [...totals.values()];
  },
});
