import recipeData from '~~/content/recipes.json';
import { buildRecipeCatalog } from '../utils/catalog';
import type { Recipe } from '../types/menu.type';

const catalog = buildRecipeCatalog(recipeData);

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
