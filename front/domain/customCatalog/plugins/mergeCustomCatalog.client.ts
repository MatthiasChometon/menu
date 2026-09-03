import { foodCatalog } from '~~/domain/menu/composables/useFoods';
import { recipeCatalog } from '~~/domain/menu/composables/useRecipes';
import { customFoodToFood, customRecipeToRecipe } from '../utils/toCatalog';
import type { CustomFood, CustomRecipe } from '../types/customCatalog.type';

// Keeps the shared catalogues honest as a signed-in reader's own foods and
// recipes load, change or disappear. A previous batch is deleted before the
// new one is written in: without it, a recipe removed on another tab would
// stay in the merged catalogue for ever, since nothing here would ever be
// told to take it back out.
let mergedFoodIds: string[] = [];
let mergedRecipeIds: string[] = [];

export default defineNuxtPlugin((): void => {
  const { foods } = useMyFoods();
  const { recipes } = useMyRecipes();

  watch(
    foods,
    (custom: CustomFood[]): void => {
      for (const id of mergedFoodIds) Reflect.deleteProperty(foodCatalog, id);
      for (const food of custom) foodCatalog[food.id] = customFoodToFood(food);
      mergedFoodIds = custom.map((food): string => food.id);
    },
    { immediate: true },
  );

  watch(
    recipes,
    (custom: CustomRecipe[]): void => {
      for (const id of mergedRecipeIds) Reflect.deleteProperty(recipeCatalog, id);
      for (const recipe of custom) recipeCatalog[recipe.id] = customRecipeToRecipe(recipe);
      mergedRecipeIds = custom.map((recipe): string => recipe.id);
    },
    { immediate: true },
  );
});
