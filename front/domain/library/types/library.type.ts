export type Month = number;

export type EnergyMacro = 'protein' | 'carbs' | 'fat';

export type PrepBucket = 'quick' | 'medium' | 'long';

export type MacroFilter = 'all' | EnergyMacro;

export type TimeFilter = 'all' | PrepBucket;

// One recipe, described the way the library browses it: what dominates it
// nutritionally, how long it takes, and what it is made of — everything a
// filter or a search box reads instead of walking the recipe again.
export type LibraryEntry = {
  recipe: Recipe;
  dominantMacro: EnergyMacro;
  prepBucket: PrepBucket;
  ingredientIds: string[];
  seasonalIngredientIds: string[];
};
