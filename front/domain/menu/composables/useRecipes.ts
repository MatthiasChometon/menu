import recipeData from '~~/domain/menu/content/recipes.json';
import { buildRecipeCatalog } from '../utils/catalog';
import type { Recipe } from '../types/menu.type';

// Reactive so a signed-in reader's own recipes can join the site's, once they
// load: mergeCustomCatalog.client.ts is the only thing that ever writes to it,
// and only in the browser. The prerender and an anonymous visit never touch
// that plugin, so both keep seeing this exact static catalogue.
export const recipeCatalog = reactive<Record<string, Recipe>>({
  ...buildRecipeCatalog(recipeData),
});

export const useRecipes = (): {
  recipes: Record<string, Recipe>;
  recipeOf: (id: string) => Recipe | undefined;
  imageOf: (recipe: Recipe) => string | undefined;
} => {
  const { recipeImage } = useImages();

  return {
    recipes: recipeCatalog,
    recipeOf: (id: string): Recipe | undefined => recipeCatalog[id],
    imageOf: (recipe: Recipe): string | undefined => recipeImage(recipe.id),
  };
};
