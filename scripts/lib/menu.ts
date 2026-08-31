import { readdirSync } from 'node:fs';
import {
  buildFoodCatalog,
  buildRecipeCatalog,
  buildSeasoningCatalog,
  freshSeasonings,
} from '../../front/domain/menu/utils/catalog.ts';
import { buildMenu, type MenuCatalog } from '../../front/domain/menu/utils/menu.ts';
import type { Menu } from '../../front/domain/menu/types/menu.type.ts';
import { readContent, readJsonAt } from './content.ts';
import { CONTENT } from './paths.ts';

export const menuCatalog = (): MenuCatalog => {
  const foods = buildFoodCatalog(readContent('foods.json'));
  const recipes = buildRecipeCatalog(readContent('recipes.json'));
  const seasonings = buildSeasoningCatalog(readContent('seasonings.json'));

  return {
    foodOf: (id: string) => foods[id],
    recipeOf: (id: string) => recipes[id],
    freshOf: (used) => freshSeasonings(used, seasonings),
  };
};

export const buildMenuAt = (path: string): Menu => buildMenu(readJsonAt(path), menuCatalog());

export const latestMenu = (): Menu => {
  const files = readdirSync(`${CONTENT}/menus`).filter((name): boolean => name.endsWith('.json')).sort();
  const latest = files.at(-1);
  if (latest === undefined) throw new Error('aucun menu dans front/content/menus');
  return buildMenuAt(`${CONTENT}/menus/${latest}`);
};

// The grammes the week needs, food by food — the shared basis every order and
// pantry computation starts from.
export const needsOf = (menu: Menu): Record<string, number> =>
  Object.fromEntries(menu.shoppingList.map((line): [string, number] => [line.food.id, line.grams]));
