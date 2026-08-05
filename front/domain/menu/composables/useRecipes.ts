import recipeData from '~~/content/recipes.json';

type RawRecipe = {
  slot: string;
  name: LocalizedText;
  prepMinutes: number;
  batch: boolean;
  ingredients: Record<string, number>;
  seasonings?: string[];
  steps: LocalizedSteps;
};

const SLOT_LIST: readonly RecipeSlot[] = ['main', 'breakfast', 'postWorkout', 'snack'];

const rawRecipes: Record<string, RawRecipe> = recipeData;

const toSlot = (value: string): RecipeSlot => SLOT_LIST.find((slot) => slot === value) ?? 'main';

const catalog: Record<string, Recipe> = Object.fromEntries(
  Object.entries(rawRecipes).map(([id, raw]): [string, Recipe] => [
    id,
    {
      id,
      slot: toSlot(raw.slot),
      name: raw.name,
      prepMinutes: raw.prepMinutes,
      batch: raw.batch,
      ingredients: raw.ingredients,
      seasonings: raw.seasonings ?? [],
      steps: raw.steps,
    },
  ]),
);

export const useRecipes = (): {
  recipes: Record<string, Recipe>;
  recipeOf: (id: string) => Recipe | undefined;
  imageOf: (recipe: Recipe) => string | undefined;
} => {
  const { recipeImage } = useImages();

  return {
    recipes: catalog,
    recipeOf: (id: string): Recipe | undefined => catalog[id],
    imageOf: (recipe: Recipe): string | undefined => recipeImage(recipe.id),
  };
};
