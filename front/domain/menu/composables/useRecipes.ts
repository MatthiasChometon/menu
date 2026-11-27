import type { Recipe } from '../types/menu.type';

// Filled by plugins/loadCatalog.ts, from its own chunk, before the app mounts:
// the entry script does not carry the JSON. Reactive so a signed-in reader's
// own recipes can join the site's, once they load: mergeCustomCatalog.client.ts
// is the only other thing that ever writes to it, and only in the browser.
export const recipeCatalog = reactive<Record<string, Recipe>>({});

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
