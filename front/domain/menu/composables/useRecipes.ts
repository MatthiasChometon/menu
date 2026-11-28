import type { LocalizedSteps, Recipe } from '../types/menu.type';

// Filled by plugins/loadCatalog.ts, from its own chunk, before the app mounts:
// the entry script does not carry the JSON. Reactive so a signed-in reader's
// own recipes can join the site's, once they load: mergeCustomCatalog.client.ts
// is the only other thing that ever writes to it, and only in the browser.
export const recipeCatalog = reactive<Record<string, Recipe>>({});

// The steps of the site's recipes, filled one recipe at a time by loadStepsOf: the
// catalogue above carries none, so a page that never shows a step never pays for them.
export const recipeSteps = reactive<Record<string, LocalizedSteps>>({});

export const useRecipes = (): {
  recipes: Record<string, Recipe>;
  recipeOf: (id: string) => Recipe | undefined;
  imageOf: (recipe: Recipe) => string | undefined;
  loadStepsOf: (id: string) => Promise<void>;
} => {
  const { recipeImage } = useImages();

  return {
    recipes: recipeCatalog,
    recipeOf: (id: string): Recipe | undefined => recipeCatalog[id],
    imageOf: (recipe: Recipe): string | undefined => recipeImage(recipe.id),
    loadStepsOf: async (id: string): Promise<void> => {
      if (id in recipeSteps) return;
      const { default: loaders } = await import('virtual:recipe-steps');
      const load = loaders[id];
      if (load !== undefined) recipeSteps[id] = (await load()).default;
    },
  };
};
