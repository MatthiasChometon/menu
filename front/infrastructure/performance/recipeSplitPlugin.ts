import { readFileSync } from 'node:fs';

const CATALOG = 'virtual:recipe-catalog';
const STEPS_INDEX = 'virtual:recipe-steps';
const STEPS_PREFIX = 'virtual:recipe-steps/';
const RESOLVED = '\0';

type RawRecipes = Record<string, { steps: unknown } & Record<string, unknown>>;

// Serialised once as a JSON.parse string, which the engine reads faster than the
// same data written as a JavaScript literal.
const moduleOf = (value: unknown): string =>
  `export default JSON.parse(${JSON.stringify(JSON.stringify(value))});`;

// The recipe book is 19 KB gzipped, 14 of which are the steps that only a recipe's
// own page (or the dish dialog, or the kitchen mode) ever shows. The browser build
// gets it in two shapes instead: `virtual:recipe-catalog`, every recipe without its
// steps (what the planner, the menu and the library read), and one chunk per recipe
// behind `virtual:recipe-steps`, a map of id to dynamic import, so a recipe's page
// downloads its own steps and no other.
export const recipeSplitPlugin = (
  recipesFile: string,
): {
  name: string;
  enforce: 'pre';
  resolveId: (id: string) => string | undefined;
  load: (id: string) => string | undefined;
} => {
  const read = (): RawRecipes => JSON.parse(readFileSync(recipesFile, 'utf8')) as RawRecipes;

  const catalogModule = (): string =>
    moduleOf(
      Object.fromEntries(
        Object.entries(read()).map(([id, { steps: _steps, ...recipe }]) => [id, recipe]),
      ),
    );

  const stepsIndexModule = (): string =>
    `export default {${Object.keys(read())
      .map((id) => `${JSON.stringify(id)}: () => import(${JSON.stringify(STEPS_PREFIX + id)})`)
      .join(',')}};`;

  const stepsModule = (id: string): string | undefined => {
    const recipe = read()[id];
    return recipe === undefined ? undefined : moduleOf(recipe.steps);
  };

  return {
    name: 'recipe-split',
    enforce: 'pre',
    resolveId: (id): string | undefined =>
      id === CATALOG || id === STEPS_INDEX || id.startsWith(STEPS_PREFIX)
        ? RESOLVED + id
        : undefined,
    load: (id): string | undefined => {
      if (id === RESOLVED + CATALOG) return catalogModule();
      if (id === RESOLVED + STEPS_INDEX) return stepsIndexModule();
      if (id.startsWith(RESOLVED + STEPS_PREFIX))
        return stepsModule(id.slice(RESOLVED.length + STEPS_PREFIX.length));
      return undefined;
    },
  };
};
