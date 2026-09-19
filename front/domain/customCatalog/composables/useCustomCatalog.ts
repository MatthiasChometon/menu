import { CustomRecipeSlot } from '#gql/default';
import type { CustomFood, CustomRecipe } from '../types/customCatalog.type';
import type { Food, Micros, Recipe, RecipeSlot } from '../../menu/types/menu.type';

type UseCustomCatalog = {
  recipeSlots: readonly RecipeSlot[];
  toAppSlot: (slot: CustomRecipeSlot) => RecipeSlot;
  toGraphqlSlot: (slot: RecipeSlot) => CustomRecipeSlot;
  toFood: (food: CustomFood) => Food;
  toRecipe: (recipe: CustomRecipe) => Recipe;
};

// Turns a reader's own foods and recipes into the shared catalogue shape, so
// the rest of the app treats them exactly like the site's own content.
export const useCustomCatalog = (): UseCustomCatalog => {
  // Custom foods carry no micronutrients and no aisle: they never came from the
  // site content that documents those, so the shared shape gets the same zeroed
  // values every food outside the catalogue already falls back to.
  const emptyMicros: Micros = {
    iron: 0,
    zinc: 0,
    magnesium: 0,
    calcium: 0,
    potassium: 0,
    vitaminC: 0,
    vitaminD: 0,
    omega3: 0,
  };

  const slotOf: Record<CustomRecipeSlot, RecipeSlot> = {
    [CustomRecipeSlot.MAIN]: 'main',
    [CustomRecipeSlot.BREAKFAST]: 'breakfast',
    [CustomRecipeSlot.POST_WORKOUT]: 'postWorkout',
    [CustomRecipeSlot.SNACK]: 'snack',
  };

  const graphqlSlotOf: Record<RecipeSlot, CustomRecipeSlot> = {
    main: CustomRecipeSlot.MAIN,
    breakfast: CustomRecipeSlot.BREAKFAST,
    postWorkout: CustomRecipeSlot.POST_WORKOUT,
    snack: CustomRecipeSlot.SNACK,
  };

  // Every slot a custom recipe's form may offer, in the site's own casing.
  const recipeSlots: readonly RecipeSlot[] = ['main', 'breakfast', 'postWorkout', 'snack'];

  const toAppSlot = (slot: CustomRecipeSlot): RecipeSlot => slotOf[slot];

  const toGraphqlSlot = (slot: RecipeSlot): CustomRecipeSlot => graphqlSlotOf[slot];

  // A name typed once, in whichever language the reader is working in: nothing
  // here was ever translated, so both halves of the site's bilingual text show
  // the same words rather than one of them silently falling back to English.
  const toLocalizedText = (text: string): Food['name'] => ({ fr: text, en: text });

  const toFood = (food: CustomFood): Food => ({
    id: food.id,
    name: toLocalizedText(food.name),
    aisle: 'grocery',
    icon: 'i-lucide-utensils',
    unit: 'g',
    kcal: food.kcal,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    fiber: food.fiber,
    micros: emptyMicros,
    pricePerKg: food.pricePerKg,
  });

  const toRecipe = (recipe: CustomRecipe): Recipe => ({
    id: recipe.id,
    slot: toAppSlot(recipe.slot),
    name: toLocalizedText(recipe.name),
    prepMinutes: recipe.prepMinutes,
    batch: recipe.batch,
    ingredients: Object.fromEntries(
      recipe.ingredients.map(({ foodId, grams }): [string, number] => [foodId, grams]),
    ),
    seasonings: [],
    steps: { fr: recipe.steps, en: recipe.steps },
  });

  return { recipeSlots, toAppSlot, toGraphqlSlot, toFood, toRecipe };
};
