// Turns the week's needs into a real drive order: not 960 g of rice but one 1 kg
// bag, aisle-sorted, minus what the pantry still holds. The needs come from the
// menu domain (buildMenu); the pack/piece rounding and the order log are the
// tooling's own, mirroring what the app delegates to its grocery server.
//
// Usage:
//   pnpm --dir scripts order            # the list to order
//   pnpm --dir scripts order --check    # has this week already been ordered?
//   pnpm --dir scripts order --record   # mark this week as ordered
//   pnpm --dir scripts order --history  # the weeks already ordered
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Aisle, Food, Menu } from '../front/domain/menu/types/menu.type.ts';
import { aisleOrder } from '../front/domain/menu/utils/catalog.ts';
import { readContent } from './lib/content.ts';
import { latestMenu } from './lib/menu.ts';
import { CONTENT } from './lib/paths.ts';

const ORDERS = join(CONTENT, 'orders.json');
const PANTRY = join(CONTENT, 'pantry.json');
const DEFAULT_STORE = 'e-leclerc-lyon-9eme';

const AISLE_LABELS: Record<Aisle, string> = {
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

type OrderLine = {
  food: Food;
  needed: number;
  inStock: number;
  quantity: number;
  kind: 'pack' | 'piece' | 'weight';
  pack?: number;
  price: number;
};

// Leftover stock only counts for weeks after the one the pantry describes.
const pantryStock = (week: string): Record<string, number> => {
  if (!existsSync(PANTRY)) return {};
  const pantry = readContent<PantryFile>('pantry.json');
  if ((pantry.afterWeek ?? '') >= week) return {};
  return pantry.items ?? {};
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const orderLine = (
  food: Food,
  need: number,
  stock: Record<string, number>,
  packs: Record<string, number | undefined>,
): OrderLine | undefined => {
  const inStock = Math.round(stock[food.id] ?? 0);
  const needed = Math.max(0, Math.round(need) - inStock);
  if (needed === 0) return undefined;

  const pack = packs[food.id];
  if (pack !== undefined) {
    return { food, needed, inStock, quantity: Math.ceil(needed / pack), kind: 'pack', pack, price: price(food, needed) };
  }
  if (food.pieceWeight !== undefined) {
    return { food, needed, inStock, quantity: Math.ceil(needed / food.pieceWeight), kind: 'piece', price: price(food, needed) };
  }
  return { food, needed, inStock, quantity: needed, kind: 'weight', price: price(food, needed) };
};

const price = (food: Food, grams: number): number => round2((food.pricePerKg * grams) / 1000);

const orderLines = (menu: Menu): OrderLine[] => {
  const stock = pantryStock(menu.weekOf);
  const packs = readContent<Record<string, { pack?: number }>>('foods.json');
  const packOf = Object.fromEntries(
    Object.entries(packs).map(([id, food]): [string, number | undefined] => [id, food.pack]),
  );

  return menu.shoppingList
    .map((line): OrderLine | undefined => orderLine(line.food, line.grams, stock, packOf))
    .filter((line): line is OrderLine => line !== undefined)
    .sort(
      (left, right): number =>
        aisleOrder.indexOf(left.food.aisle) - aisleOrder.indexOf(right.food.aisle) ||
        right.price - left.price,
    );
};

export const describe = (line: OrderLine): string => {
  const need = line.inStock ? `${line.needed} ${line.food.unit}, ${line.inStock} deja en stock` : `${line.needed} ${line.food.unit}`;
  if (line.kind === 'pack') return `${line.quantity} x ${line.pack} ${line.food.unit} (besoin ${need})`;
  if (line.kind === 'piece') return `${line.quantity} piece(s) (besoin ${need})`;
  return `${need} au poids`;
};

const loadOrders = (): OrdersFile => (existsSync(ORDERS) ? readContent<OrdersFile>('orders.json') : { orders: [] });

const printList = (menu: Menu, lines: OrderLine[], already: OrderRecord | undefined): void => {
  const total = lines.reduce((sum, line): number => sum + line.price, 0);
  console.log(`SEMAINE ${menu.weekOf} — ${lines.length} articles — ~${Math.round(total)} EUR`);
  if (already !== undefined) console.log(`!! DEJA COMMANDE le ${already.orderedAt}`);

  let aisle: Aisle | undefined;
  for (const line of lines) {
    if (line.food.aisle !== aisle) {
      aisle = line.food.aisle;
      console.log(`\n[${AISLE_LABELS[aisle]}]`);
    }
    console.log(`  ${line.food.name.fr.padEnd(30)} ${describe(line)}`);
  }
};

const main = (): number => {
  const { values } = parseArgs({
    options: {
      check: { type: 'boolean', default: false },
      record: { type: 'boolean', default: false },
      history: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      store: { type: 'string', default: DEFAULT_STORE },
    },
  });

  const menu = latestMenu();
  const lines = orderLines(menu);
  const orders = loadOrders();
  const already = orders.orders.find((order): boolean => order.weekOf === menu.weekOf);

  if (values.check) {
    if (already === undefined) {
      console.log(`NON_COMMANDE ${menu.weekOf}`);
      return 0;
    }
    console.log(`DEJA_COMMANDE ${menu.weekOf} le ${already.orderedAt} chez ${already.store}`);
    return 1;
  }

  if (values.history) {
    if (orders.orders.length === 0) console.log('aucune commande enregistree');
    for (const order of orders.orders) {
      console.log(`${order.weekOf} — ${order.orderedAt} — ${order.store} — ${order.items} articles`);
    }
    return 0;
  }

  if (values.record) {
    if (already !== undefined) {
      console.log(`deja enregistre: ${menu.weekOf}`);
      return 0;
    }
    orders.orders.push({ weekOf: menu.weekOf, orderedAt: menu.weekOf, store: values.store, items: lines.length });
    orders.orders.sort((left, right): number => right.weekOf.localeCompare(left.weekOf));
    writeFileSync(ORDERS, JSON.stringify(orders, null, 2) + '\n', 'utf8');
    console.log(`enregistre: ${menu.weekOf} (${lines.length} articles)`);
    return 0;
  }

  if (values.json) {
    console.log(JSON.stringify({ weekOf: menu.weekOf, lines }, null, 2));
    return 0;
  }

  printList(menu, lines, already);
  return 0;
};

if (process.argv[1]?.endsWith('order.ts')) process.exit(main());
