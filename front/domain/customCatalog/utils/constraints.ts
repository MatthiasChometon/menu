// Mirrors the back's own bounds (customFood/utils.ts, customRecipe/utils.ts)
// so a form says "too long" or "too many" before the server does — being
// refused after filling in a whole recipe is the moment people give up.
export const customFoodFormConstraints = (): {
  maxNameLength: number;
  maxKcal: number;
  maxMacro: number;
  maxPricePerKg: number;
} => ({
  maxNameLength: 60,
  maxKcal: 950,
  maxMacro: 100,
  maxPricePerKg: 500,
});

export const customRecipeFormConstraints = (): {
  maxNameLength: number;
  maxIngredients: number;
  maxSteps: number;
  maxStepLength: number;
  maxGramsPerIngredient: number;
  maxPrepMinutes: number;
} => ({
  maxNameLength: 80,
  maxIngredients: 30,
  maxSteps: 30,
  maxStepLength: 500,
  maxGramsPerIngredient: 5000,
  maxPrepMinutes: 600,
});
