// Works out what is left in the pantry after the week and deducts it from the
// next order: whole packs are bought but only the need is used, so the surplus
// carries over. Needs come from the menu domain; the keep/perish rules are the
// tooling's own, matching the grocery server's pantry.
//
// Usage:
//   pnpm --dir scripts pantry --preview   # what will be left, writing nothing
//   pnpm --dir scripts pantry --update    # write content/pantry.json
//   pnpm --dir scripts pantry --show      # the currently recorded stock
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Food } from '../front/domain/menu/types/menu.type.ts';
import { readContent } from './lib/content.ts';
import { latestMenu, menuCatalog, needsOf } from './lib/menu.ts';
import { CONTENT } from './lib/paths.ts';

const PANTRY = join(CONTENT, 'pantry.json');

type Product = { size: number; units: number; name: string };
type PantryFile = { afterWeek: string; items: Record<string, number> };

// What does not keep from one week to the next: no point counting leftover
// salmon or salad as stock.
const PERISHABLE_AISLES = new Set(['butcher', 'produce']);
const PERISHABLE_IDS = new Set(['skyr', 'quark', 'egg', 'wholeMilk', 'semiSkimmedMilk', 'hardCheese']);

export const keeps = (food: Food): boolean =>
  !PERISHABLE_IDS.has(food.id) && !PERISHABLE_AISLES.has(food.aisle);

type PantryRow = {
  food: Food;
  purchased: number;
  used: number;
  left: number;
  keeps: boolean;
};

const pantryRows = (): PantryRow[] => {
  const menu = latestMenu();
  const needs = needsOf(menu);
  const { foodOf } = menuCatalog();
  const bought = readContent<Record<string, Product>>('carrefour-products.json');
  const previous = existsSync(PANTRY) ? readContent<PantryFile>('pantry.json').items : {};

  return Object.entries(bought)
    .filter(([id]): boolean => !id.startsWith('_'))
    .map(([id, product]): PantryRow => {
      const food = foodOf(id);
      if (food === undefined) throw new Error(`aliment '${id}' absent de foods.json`);

      const purchased = product.size * product.units;
      const used = Math.round(needs[id] ?? 0);
      const left = Math.max(0, Math.round((previous[id] ?? 0) + purchased - (needs[id] ?? 0)));
      return { food, purchased, used, left, keeps: keeps(food) };
    })
    .sort((left, right): number => Number(right.keeps) - Number(left.keeps) || right.left - left.left);
};

const printRows = (rows: PantryRow[], week: string): void => {
  console.log(`APRES LA SEMAINE ${week} — ce qu'il restera\n`);

  console.log('Se garde (a deduire de la prochaine commande) :');
  for (const row of rows.filter((row): boolean => row.keeps && row.left > 0)) {
    console.log(
      `  ${row.food.name.fr.padEnd(28)} ${String(row.left).padStart(5)} ${row.food.unit.padEnd(3)}` +
        `  (achete ${row.purchased}, utilise ${row.used})`,
    );
  }

  const perishable = rows.filter((row): boolean => !row.keeps && row.left > 0);
  if (perishable.length > 0) {
    console.log('\nA consommer, pas compte en stock (frais) :');
    for (const row of perishable) console.log(`  ${row.food.name.fr.padEnd(28)} ${String(row.left).padStart(5)} ${row.food.unit}`);
  }

  const short = rows.filter((row): boolean => row.left === 0 && row.used > row.purchased);
  if (short.length > 0) {
    console.log('\nJuste ou insuffisant :');
    for (const row of short) console.log(`  ${row.food.name.fr.padEnd(28)} besoin ${row.used}, achete ${row.purchased}`);
  }
};

const showStock = (): number => {
  if (!existsSync(PANTRY)) {
    console.log('aucun stock enregistre');
    return 0;
  }
  const pantry = readContent<PantryFile>('pantry.json');
  console.log(`STOCK apres la semaine ${pantry.afterWeek}`);
  for (const [id, amount] of Object.entries(pantry.items).sort((left, right): number => right[1] - left[1])) {
    console.log(`  ${id.padEnd(20)} ${amount}`);
  }
  return 0;
};

const main = (): number => {
  const { values } = parseArgs({
    options: {
      preview: { type: 'boolean', default: false },
      update: { type: 'boolean', default: false },
      show: { type: 'boolean', default: false },
    },
  });

  if (values.show) return showStock();

  const menu = latestMenu();
  const rows = pantryRows();
  printRows(rows, menu.weekOf);

  if (values.update) {
    const kept = rows.filter((row): boolean => row.keeps && row.left > 0);
    const items = Object.fromEntries(kept.map((row): [string, number] => [row.food.id, row.left]));
    writeFileSync(PANTRY, JSON.stringify({ afterWeek: menu.weekOf, items }, null, 2) + '\n', 'utf8');
    console.log(`\n${kept.length} produits enregistres dans front/content/pantry.json`);
  }

  return 0;
};

if (process.argv[1]?.endsWith('pantry.ts')) process.exit(main());
