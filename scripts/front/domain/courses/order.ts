// Prepares the week's drive order: turns each need into a real number of items
// (not 960 g of rice but one 1 kg bag), aisle-sorted. buildLines()/pantryStock()/
// describe() hold the logic; main() is the CLI and the order log.
//
// Usage:
//   pnpm order --list      # the list to order
//   pnpm order --check     # has this week already been ordered?
//   pnpm order --record    # mark this week as ordered
//   pnpm order --history   # the weeks already ordered
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
} from '../../../lib/content.ts';

const ORDERS = join(CONTENT, 'orders.json');
const AISLE_ORDER = ['butcher', 'dairy', 'produce', 'frozen', 'grocery', 'supplement'];
const AISLE_LABELS: Record<string, string> = {
  butcher: 'Boucherie et poissonnerie',
  dairy: 'Cremerie',
  produce: 'Fruits et legumes',
  frozen: 'Surgeles',
  grocery: 'Epicerie',
  supplement: 'Complements',
};

type PantryFile = { afterWeek?: string; items?: Record<string, number> };
type OrderRecord = { weekOf: string; orderedAt: string; store: string; items: number };
type OrdersFile = { orders: OrderRecord[] };

export type OrderLine = {
  id: string;
  name: string;
  aisle: string;
  needed: number;
  inStock: number;
  unit: string;
  pack: number | null;
  quantity: number;
  kind: 'pack' | 'piece' | 'weight';
  price: number;
};

/** Leftover stock to deduct — only counts for weeks AFTER the one it describes. */
export const pantryStock = (
  pantry: PantryFile | undefined,
  week: string,
): Record<string, number> => {
  if (pantry === undefined || (pantry.afterWeek ?? '') >= week) return {};
  return pantry.items ?? {};
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const buildLines = (
  needs: Record<string, number>,
  foods: Catalog,
  stock: Record<string, number>,
): OrderLine[] => {
  const lines: OrderLine[] = [];
  for (const [foodId, rawNeed] of Object.entries(needs)) {
    const food = foods[foodId];
    if (food === undefined) throw new Error(`aliment '${foodId}' absent de foods.json`);

    const inStock = stock[foodId] ?? 0;
    const needed = Math.max(0, rawNeed - inStock);
    if (needed === 0) continue;

    const rounded = Math.round(needed);
    const pack = food.pack;
    const piece = food.pieceWeight;
    let quantity: number;
    let kind: OrderLine['kind'];
    if (pack) {
      quantity = Math.ceil(rounded / pack);
      kind = 'pack';
    } else if (piece) {
      quantity = Math.ceil(rounded / piece);
      kind = 'piece';
    } else {
      quantity = rounded;
      kind = 'weight';
    }

    lines.push({
      id: foodId,
      name: food.name.fr,
      aisle: food.aisle ?? 'grocery',
      needed: rounded,
      inStock: Math.round(inStock),
      unit: food.unit ?? 'g',
      pack: pack ?? null,
      quantity,
      kind,
      price: round2(((food.pricePerKg ?? 0) * rounded) / 1000),
    });
  }

  lines.sort(
    (a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) || b.price - a.price,
  );
  return lines;
};

export const describe = (line: OrderLine): string => {
  let needed = `${line.needed} ${line.unit}`;
  if (line.inStock) needed += `, ${line.inStock} deja en stock`;
  if (line.kind === 'pack') return `${line.quantity} x ${line.pack} ${line.unit} (besoin ${needed})`;
  if (line.kind === 'piece') return `${line.quantity} piece(s) (besoin ${needed})`;
  return `${needed} au poids`;
};

const loadOrders = (): OrdersFile => (existsSync(ORDERS) ? readJson<OrdersFile>(ORDERS) : { orders: [] });

const main = (): number => {
  const { values } = parseArgs({
    options: {
      list: { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      record: { type: 'boolean', default: false },
      history: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      store: { type: 'string', default: 'e-leclerc-lyon-9eme' },
    },
  });

  const menu = loadLatestMenu();
  const week = menu.weekOf ?? '';
  const pantry = existsSync(join(CONTENT, 'pantry.json'))
    ? readJson<PantryFile>(join(CONTENT, 'pantry.json'))
    : undefined;
  const lines = buildLines(needsOf(menu), loadFoods(), pantryStock(pantry, week));
  const done = loadOrders();
  const already = done.orders.find((order) => order.weekOf === week);

  if (values.check) {
    if (already === undefined) {
      console.log(`NON_COMMANDE ${week}`);
      return 0;
    }
    console.log(`DEJA_COMMANDE ${week} le ${already.orderedAt} chez ${already.store}`);
    return 1;
  }

  if (values.history) {
    if (done.orders.length === 0) {
      console.log('aucune commande enregistree');
      return 0;
    }
    for (const order of done.orders) {
      console.log(`${order.weekOf} — ${order.orderedAt} — ${order.store} — ${order.items} articles`);
    }
    return 0;
  }

  if (values.record) {
    if (already !== undefined) {
      console.log(`deja enregistre: ${week}`);
      return 0;
    }
    done.orders.push({ weekOf: week, orderedAt: week, store: values.store, items: lines.length });
    done.orders.sort((a, b) => (a.weekOf < b.weekOf ? 1 : a.weekOf > b.weekOf ? -1 : 0));
    writeFileSync(ORDERS, JSON.stringify(done, null, 2) + '\n', 'utf8');
    console.log(`enregistre: ${week} (${lines.length} articles)`);
    return 0;
  }

  if (values.json) {
    console.log(JSON.stringify({ weekOf: week, lines }, null, 2));
    return 0;
  }

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  console.log(`SEMAINE ${week} — ${lines.length} articles — ~${Math.round(total)} EUR`);
  if (already !== undefined) console.log(`!! DEJA COMMANDE le ${already.orderedAt}`);

  let aisle: string | undefined;
  for (const line of lines) {
    if (line.aisle !== aisle) {
      aisle = line.aisle;
      console.log(`\n[${AISLE_LABELS[aisle] ?? aisle}]`);
    }
    console.log(`  ${line.name.padEnd(30)} ${describe(line)}`);
  }
  return 0;
};

if (process.argv[1]?.endsWith('order.ts')) process.exit(main());
