import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT } from './paths.ts';

export const MACROS = ['kcal', 'protein', 'fat', 'carbs', 'fiber'] as const;
export type Macro = (typeof MACROS)[number];

export type Food = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  pricePerKg?: number;
  aisle?: string;
  unit?: string;
  /** Pack size to round the order up to (a 1 kg bag of rice); grams/ml. */
  pack?: number;
  /** Weight of one piece, for items ordered by the unit (a banana). */
  pieceWeight?: number;
  name: { fr: string; en: string };
};

export type Catalog = Record<string, Food>;

/** One meal: a recipe id (optional) and its foods, keyed by food id → grams. */
export type Meal = { recipe?: string; foods: Record<string, number> };

/** A week's menu: targets plus days → meal name → meal. */
export type Menu = {
  weekOf?: string;
  targets: Partial<Record<Macro, number>> & {
    tolerancePct?: number | Partial<Record<Macro | 'default', number>>;
  };
  days: Record<string, Record<string, Meal>>;
};

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

// foods.json carries `_`-prefixed metadata keys alongside the foods; drop them.
export const loadFoods = (): Catalog => {
  const raw = readJson<Record<string, Food>>(join(CONTENT, 'foods.json'));
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !key.startsWith('_')));
};

export const loadMenu = (path: string): Menu => readJson<Menu>(path);

/** The most recent menu on disk (files are named by ISO week, so sort by name). */
export const loadLatestMenu = (): Menu => {
  const files = readdirSync(join(CONTENT, 'menus'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .reverse();
  const latest = files[0];
  if (latest === undefined) throw new Error('aucun menu dans content/menus/');
  return loadMenu(join(CONTENT, 'menus', latest));
};

/** Total grams needed per food across the whole week, summed over days and meals. */
export const needsOf = (menu: Menu): Record<string, number> => {
  const needs: Record<string, number> = {};
  for (const day of Object.values(menu.days)) {
    for (const meal of Object.values(day)) {
      for (const [foodId, grams] of Object.entries(meal.foods)) {
        needs[foodId] = (needs[foodId] ?? 0) + grams;
      }
    }
  }
  return needs;
};
