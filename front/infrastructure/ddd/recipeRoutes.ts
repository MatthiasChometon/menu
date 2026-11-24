import { readFileSync } from 'node:fs';

const RECIPES_FILE = 'domain/menu/content/recipes.json';

// JSON.parse says nothing about the shape of what it read: a recipe book that is
// not an object keyed by id must stop the build, not prerender no recipe at all.
const recipeIdList = (): string[] => {
  const recipes: unknown = JSON.parse(readFileSync(RECIPES_FILE, 'utf8'));
  if (typeof recipes !== 'object' || recipes === null || Array.isArray(recipes)) {
    throw new Error(`${RECIPES_FILE} must be an object keyed by recipe id`);
  }
  return Object.keys(recipes);
};

// The prerender crawler only follows links, so it only ever reached the recipes
// the current week serves — the rest of the book had no page at all. Every
// recipe is listed explicitly so the whole catalogue is readable, whether or not
// it is on this week's menu.
export const recipeRouteList = (): string[] => recipeIdList().map((id) => `/recette/${id}`);
