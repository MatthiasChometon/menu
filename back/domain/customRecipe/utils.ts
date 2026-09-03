// A food id, either a site catalogue entry (a plain camelCase word) or another
// custom food's UUID (digits, letters and hyphens). Loose enough to admit
// both, strict enough to keep anything else out of the ingredients column.
export const FOOD_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

// Tells a custom food's id apart from a site catalogue one, so an ingredient
// can be checked against its owner only when it needs to be: the site
// catalogue is not a table this API can look up.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isCustomFoodId = (foodId: string): boolean => UUID.test(foodId);

export const customRecipeConstraints = (): {
  maxNameLength: number;
  maxItems: number;
  maxIngredients: number;
  maxSteps: number;
  maxStepLength: number;
  maxGramsPerIngredient: number;
  maxPrepMinutes: number;
} => ({
  maxNameLength: 80,
  // A ceiling rather than a rule about kitchens: it stops a runaway script
  // from filling the table, and no one's own book needs more than this.
  maxItems: 200,
  maxIngredients: 30,
  maxSteps: 30,
  maxStepLength: 500,
  maxGramsPerIngredient: 5000,
  maxPrepMinutes: 600,
});
