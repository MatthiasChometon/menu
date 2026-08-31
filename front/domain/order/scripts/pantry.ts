// Works out what is left in the pantry after the week and deducts it from the
// next order: whole packs are bought but only the need is used, so the surplus
// carries over. Needs come from the menu domain, keep/leftover from
// domain/order/utils; this runner reads carrefour-products.json and prints.
//
// Usage:
//   pnpm --dir front pantry --preview   # what will be left, writing nothing
//   pnpm --dir front pantry --update    # write domain/menu/content/pantry.json
//   pnpm --dir front pantry --show      # the currently recorded stock
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Food } from '../../menu/types/menu.type';
import { latestMenu, menuCatalog, needsOf } from '../../menu/scripts/loader';
import { keeps, leftover } from '../utils/pantry';
import { CONTENT } from '../../../infrastructure/asset/scripts/paths';
import { readContent } from '../../../infrastructure/asset/scripts/content';

const PANTRY = join(CONTENT, 'pantry.json');

type Product = { size: number; units: number; name: string };
type PantryFile = { afterWeek: string; items: Record<string, number> };

type PantryRow = { food: Food; purchased: number; used: number; left: number; keeps: boolean };

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
      return {
        food,
        purchased,
        used: Math.round(needs[id] ?? 0),
        left: leftover(previous[id] ?? 0, purchased, needs[id] ?? 0),
        keeps: keeps(food),
      };
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
    console.log(`\n${kept.length} produits enregistres dans domain/menu/content/pantry.json`);
  }

  return 0;
};

if (process.argv[1]?.endsWith('pantry.ts')) process.exit(main());
