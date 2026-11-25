import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { useCatalogBuilder } from '../composables/useCatalogBuilder';
import { useMenuBuilder } from '../composables/useMenuBuilder';
import type { Menu, MenuCatalog } from '../types/menu.type';
import { CONTENT } from '../../../infrastructure/asset/scripts/paths';
import { readContent, readJsonAt } from '../../../infrastructure/asset/scripts/content';

const { buildFoodCatalog, buildRecipeCatalog, buildSeasoningCatalog, freshSeasonings } =
  useCatalogBuilder();
const { buildMenu } = useMenuBuilder();

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
  const files = readdirSync(join(CONTENT, 'menus'))
    .filter((name): boolean => name.endsWith('.json'))
    .sort();
  const latest = files.at(-1);
  if (latest === undefined) throw new Error('aucun menu dans domain/menu/content/menus');
  return buildMenuAt(join(CONTENT, 'menus', latest));
};

// The grammes the week needs, food by food — the basis every order and pantry
// computation starts from.
export const needsOf = (menu: Menu): Record<string, number> =>
  Object.fromEntries(menu.shoppingList.map((line): [string, number] => [line.food.id, line.grams]));
