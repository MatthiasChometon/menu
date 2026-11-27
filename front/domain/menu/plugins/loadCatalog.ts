import { foodCatalog } from '../composables/useFoods';
import { recipeCatalog } from '../composables/useRecipes';

// The catalogues are about 25 KB gzipped of JSON that every page reads, but
// that no page needs before the plugins have run: loading them here, from
// their own chunk, keeps them out of the entry script the browser has to parse
// before anything else. enforce 'pre' puts it ahead of every plugin that reads
// the catalogues, and Nuxt waits for it before it mounts the app, so the
// prerender and the hydration both see the full catalogue.
export default defineNuxtPlugin({
  name: 'load-catalog',
  enforce: 'pre',
  setup: async (): Promise<void> => {
    const { buildFoodCatalog, buildRecipeCatalog } = useCatalogBuilder();
    const [foods, recipes] = await Promise.all([
      import('~~/domain/menu/content/foods.json'),
      import('~~/domain/menu/content/recipes.json'),
    ]);
    Object.assign(foodCatalog, buildFoodCatalog(foods.default));
    Object.assign(recipeCatalog, buildRecipeCatalog(recipes.default));
  },
});
