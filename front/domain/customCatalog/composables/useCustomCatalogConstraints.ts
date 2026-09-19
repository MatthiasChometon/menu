type CustomFoodConstraints = {
  maxNameLength: number;
  maxKcal: number;
  maxMacro: number;
  maxPricePerKg: number;
};

type CustomRecipeConstraints = {
  maxNameLength: number;
  maxIngredients: number;
  maxSteps: number;
  maxStepLength: number;
  maxGramsPerIngredient: number;
  maxPrepMinutes: number;
};

type UseCustomCatalogConstraints = {
  food: CustomFoodConstraints;
  recipe: CustomRecipeConstraints;
};

// Mirrors the back's own bounds (customFood, customRecipe) so a form says "too
// long" or "too many" before the server does — being refused after filling in a
// whole recipe is the moment people give up.
export const useCustomCatalogConstraints = (): UseCustomCatalogConstraints => ({
  food: {
    maxNameLength: 60,
    maxKcal: 950,
    maxMacro: 100,
    maxPricePerKg: 500,
  },
  recipe: {
    maxNameLength: 80,
    maxIngredients: 30,
    maxSteps: 30,
    maxStepLength: 500,
    maxGramsPerIngredient: 5000,
    maxPrepMinutes: 600,
  },
});
