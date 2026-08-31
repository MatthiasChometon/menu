// Works out what is left in the pantry after the week and deducts it from the
// next order: whole packs are bought but only the need is used, so the surplus
// carries over. computePantry()/keeps() hold the logic; main() is the CLI.
//
// Usage:
//   pnpm pantry --preview   # what will be left, writing nothing
//   pnpm pantry --update    # write content/pantry.json
//   pnpm pantry --show      # the currently recorded stock
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CONTENT } from '../../../lib/paths.ts';
import {
  loadFoods,
  loadLatestMenu,
  needsOf,
  readJson,
  type Catalog,
  type Food,
} from '../../../lib/content.ts';

const PANTRY = join(CONTENT, 'pantry.json');

type Product = { size: number; units: number; name: string };
type PantryFile = { afterWeek: string; items: Record<string, number> };

// What does not keep from one week to the next: no point counting leftover
// salmon or salad as stock.
const PERISHABLE_AISLES = new Set(['butcher', 'produce']);
const PERISHABLE_IDS = new Set(['skyr', 'quark', 'egg', 'wholeMilk', 'semiSkimmedMilk', 'hardCheese']);

export const keeps = (foodId: string, food: Food): boolean =>
  !PERISHABLE_IDS.has(foodId) && !(food.aisle !== undefined && PERISHABLE_AISLES.has(food.aisle));

export type PantryRow = {
  id: string;
  name: string;
  unit: string;
  purchased: number;
  used: number;
  left: number;
  keeps: boolean;
  product: string;
};

export const computePantry = (
  needs: Record<string, number>,
  foods: Catalog,
  bought: Record<string, Product>,
  previous: Record<string, number>,
): PantryRow[] => {
  const rows: PantryRow[] = [];
  for (const [foodId, product] of Object.entries(bought)) {
    if (foodId.startsWith('_')) continue;
    const food = foods[foodId];
    if (food === undefined) throw new Error(`aliment '${foodId}' absent de foods.json`);

    const stocked = previous[foodId] ?? 0;
    const purchased = product.size * product.units;
    const left = Math.round(stocked + purchased - (needs[foodId] ?? 0));
    rows.push({
      id: foodId,
      name: food.name.fr,
      unit: food.unit ?? 'g',
      purchased,
      used: Math.round(needs[foodId] ?? 0),
      left: Math.max(0, left),
      keeps: keeps(foodId, food),
      product: product.name,
    });
  }
  // Keepers first, then the biggest surplus.
  rows.sort((a, b) => Number(!a.keeps) - Number(!b.keeps) || b.left - a.left);
  return rows;
};

const showStock = (): number => {
  if (!existsSync(PANTRY)) {
    console.log('aucun stock enregistre');
    return 0;
  }
  const pantry = readJson<PantryFile>(PANTRY);
  console.log(`STOCK apres la semaine ${pantry.afterWeek}`);
  for (const [foodId, amount] of Object.entries(pantry.items).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${foodId.padEnd(20)} ${amount}`);
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

  const menu = loadLatestMenu();
  const week = menu.weekOf ?? '';
  const bought = readJson<Record<string, Product>>(join(CONTENT, 'carrefour-products.json'));
  const previous = existsSync(PANTRY) ? readJson<PantryFile>(PANTRY).items : {};
  const rows = computePantry(needsOf(menu), loadFoods(), bought, previous);
  const kept = rows.filter((row) => row.keeps && row.left > 0);

  console.log(`APRES LA SEMAINE ${week} — ce qu'il restera\n`);
  console.log('Se garde (a deduire de la prochaine commande) :');
  for (const row of kept) {
    console.log(
      `  ${row.name.padEnd(28)} ${String(row.left).padStart(5)} ${row.unit.padEnd(3)}` +
        `  (achete ${row.purchased}, utilise ${row.used})`,
    );
  }

  const perishable = rows.filter((row) => !row.keeps && row.left > 0);
  if (perishable.length > 0) {
    console.log('\nA consommer, pas compte en stock (frais) :');
    for (const row of perishable) {
      console.log(`  ${row.name.padEnd(28)} ${String(row.left).padStart(5)} ${row.unit}`);
    }
  }

  const short = rows.filter((row) => row.left === 0 && row.used > row.purchased);
  if (short.length > 0) {
    console.log('\nJuste ou insuffisant :');
    for (const row of short) {
      console.log(`  ${row.name.padEnd(28)} besoin ${row.used}, achete ${row.purchased}`);
    }
  }

  if (values.update) {
    const items = Object.fromEntries(kept.map((row) => [row.id, row.left]));
    writeFileSync(PANTRY, JSON.stringify({ afterWeek: week, items }, null, 2) + '\n', 'utf8');
    console.log(`\n${kept.length} produits enregistres dans front/content/pantry.json`);
  }

  return 0;
};

if (process.argv[1]?.endsWith('pantry.ts')) process.exit(main());
