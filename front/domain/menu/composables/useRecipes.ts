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
  loadStepsOf: (id: string, options?: { ship?: boolean }) => Promise<void>;
} => {
  const { recipeImage } = useImages();

  return {
    recipes: recipeCatalog,
    recipeOf: (id: string): Recipe | undefined => recipeCatalog[id],
    imageOf: (recipe: Recipe): string | undefined => recipeImage(recipe.id),
    // `ship` puts the steps in the page's payload: the prerendered page then carries
    // them and the browser reads them back without a request of its own, which a
    // recipe's own page, being what it is opened for, can afford. Called from a
    // component's setup, before anything is awaited, since it reads the nuxt app.
    loadStepsOf: async (id: string, { ship = false } = {}): Promise<void> => {
      const shipped = ship ? useState<LocalizedSteps | undefined>(`recipe-steps:${id}`) : undefined;
      let steps = shipped?.value ?? recipeSteps[id];
      if (steps === undefined) {
        const { default: loaders } = await import('virtual:recipe-steps');
        steps = (await loaders[id]?.())?.default;
      }
      if (steps === undefined) return;

      recipeSteps[id] = steps;
      if (shipped !== undefined) shipped.value = steps;
    },
  };
};
