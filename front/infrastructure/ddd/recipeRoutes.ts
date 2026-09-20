import { readFileSync } from 'node:fs';

// The prerender crawler only follows links, so it only ever reached the recipes
// the current week serves — the rest of the book had no page at all. Every
// recipe is listed explicitly so the whole catalogue is readable, whether or not
// it is on this week's menu.
export const recipeRouteList = (): string[] =>
  Object.keys(
    JSON.parse(readFileSync('domain/menu/content/recipes.json', 'utf8')) as Record<string, unknown>,
  ).map((id) => `/recette/${id}`);
