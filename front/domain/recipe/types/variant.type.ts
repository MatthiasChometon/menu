export type RecipeServing = {
  day: DayKey;
  slot: MealSlot;
};

export type RecipeVariant = {
  id: string;
  isReduced: boolean;
  quantities: FoodQuantity[];
  macros: Macros;
  servings: RecipeServing[];
};
