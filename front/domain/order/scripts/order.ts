// Turns the week's needs into a real drive order: not 960 g of rice but one 1 kg
// bag, aisle-sorted, minus what the pantry still holds. Needs come from the menu
// domain (buildMenu) and the rounding from domain/order/utils; this runner reads
// the files, keeps the order log, and prints.
//
// Usage:
//   pnpm --dir front order            # the list to order
//   pnpm --dir front order --check    # has this week already been ordered?
//   pnpm --dir front order --record   # mark this week as ordered
//   pnpm --dir front order --history  # the weeks already ordered
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { aisleOrder } from '../../menu/utils/catalog';
import type { Aisle, Menu } from '../../menu/types/menu.type';
import { latestMenu } from '../../menu/scripts/loader';
import { describeOrderLine, orderLine, type OrderLine } from '../utils/order';
import { CONTENT } from '../../../infrastructure/asset/scripts/paths';
import { readContent } from '../../../infrastructure/asset/scripts/content';

const ORDERS = join(CONTENT, 'orders.json');
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

// Leftover stock only counts for weeks after the one the pantry describes.
const pantryStock = (week: string): Record<string, number> => {
  if (!existsSync(join(CONTENT, 'pantry.json'))) return {};
  const pantry = readContent<PantryFile>('pantry.json');
  if ((pantry.afterWeek ?? '') >= week) return {};
  return pantry.items ?? {};
};

const orderLines = (menu: Menu): OrderLine[] => {
  const stock = pantryStock(menu.weekOf);
  const raw = readContent<Record<string, { pack?: number }>>('foods.json');
  const packs = Object.fromEntries(
    Object.entries(raw).map(([id, food]): [string, number | undefined] => [id, food.pack]),
  );

  return menu.shoppingList
    .map((line): OrderLine | undefined => orderLine(line.food, line.grams, stock, packs))
    .filter((line): line is OrderLine => line !== undefined)
    .sort(
      (left, right): number =>
        aisleOrder.indexOf(left.food.aisle) - aisleOrder.indexOf(right.food.aisle) ||
        right.price - left.price,
    );
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
    console.log(`  ${line.food.name.fr.padEnd(30)} ${describeOrderLine(line)}`);
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
    console.log(
      already === undefined
        ? `NON_COMMANDE ${menu.weekOf}`
        : `DEJA_COMMANDE ${menu.weekOf} le ${already.orderedAt} chez ${already.store}`,
    );
    return already === undefined ? 0 : 1;
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
