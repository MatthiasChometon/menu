const QUICK_MAX_MINUTES = 20;
const MEDIUM_MAX_MINUTES = 40;

const prepBucketOf = (prepMinutes: number): PrepBucket => {
  if (prepMinutes <= QUICK_MAX_MINUTES) return 'quick';
  if (prepMinutes <= MEDIUM_MAX_MINUTES) return 'medium';
  return 'long';
};

// The recipe as written, not scaled to anyone's profile: the library
// describes dishes, not portions, so it reads the same for every visitor.
const quantitiesOf = (recipe: Recipe, foodOf: (id: string) => Food | undefined): FoodQuantity[] =>
  Object.entries(recipe.ingredients)
    .map(([foodId, grams]): FoodQuantity | undefined => {
      const food = foodOf(foodId);
      return food === undefined ? undefined : { food, grams };
    })
    .filter((quantity): quantity is FoodQuantity => quantity !== undefined);

const dominantMacroOf = (
  macros: Macros,
  energyOf: (macros: Macros) => Record<EnergyMacro, number>,
): EnergyMacro => {
  const energy = energyOf(macros);
  return energy.protein >= energy.carbs && energy.protein >= energy.fat
    ? 'protein'
    : energy.carbs >= energy.fat
      ? 'carbs'
      : 'fat';
};

export const useRecipeCatalog = (): {
  entriesOf: (recipes: Recipe[], month: Month) => LibraryEntry[];
} => {
  const { foodOf } = useFoods();
  const { macrosOfQuantities } = useNutrition();
  const { isInSeason } = useSeason();

  const energyOf = (macros: Macros): Record<EnergyMacro, number> => ({
    protein: macros.protein * 4,
    carbs: macros.carbs * 4,
    fat: macros.fat * 9,
  });

  const entryOf = (recipe: Recipe, month: Month): LibraryEntry => {
    const quantities = quantitiesOf(recipe, foodOf);
    const ingredientIds = quantities.map(({ food }): string => food.id);

    return {
      recipe,
      dominantMacro: dominantMacroOf(macrosOfQuantities(quantities), energyOf),
      prepBucket: prepBucketOf(recipe.prepMinutes),
      ingredientIds,
      seasonalIngredientIds: ingredientIds.filter((id): boolean => isInSeason(id, month)),
    };
  };

  return {
    entriesOf: (recipes: Recipe[], month: Month): LibraryEntry[] =>
      recipes.map((recipe): LibraryEntry => entryOf(recipe, month)),
  };
};
