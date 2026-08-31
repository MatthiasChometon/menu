// Checks that a week's menu meets the nutrition targets, and can print the
// aisle-sorted shopping list. The pure functions below (mealTotals / verdict /
// analyse) hold the logic and are unit-tested; main() is only the CLI shell.
//
// Usage:
//   pnpm check front/content/menus/2026-08-03.json
//   pnpm check front/content/menus/2026-08-03.json --courses --detail
import { isAbsolute, join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from '../../../lib/paths.ts';
import {
  MACROS,
  loadFoods,
  loadMenu,
  type Catalog,
  type Macro,
  type Menu,
} from '../../../lib/content.ts';

const LABELS: Record<Macro, string> = {
  kcal: 'kcal',
  protein: 'Prot',
  fat: 'Lip',
  carbs: 'Gluc',
  fiber: 'Fibres',
};
const MEAL_ORDER = ['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner'];
const AISLE_ORDER = ['butcher', 'dairy', 'produce', 'frozen', 'grocery', 'supplement'];

type Tolerance = Menu['targets']['tolerancePct'];
export type Totals = Record<Macro, number> & { price: number };
export type Verdict = 'OK' | 'BAS' | 'HAUT' | '';

const emptyTotals = (): Totals => ({ kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, price: 0 });

export const toleranceFor = (macro: Macro, tolerance: Tolerance): number => {
  if (typeof tolerance === 'object' && tolerance !== null) {
    return tolerance[macro] ?? tolerance.default ?? 5;
  }
  return tolerance ?? 5;
};

/** Sum a meal's foods; kcal is recomputed from macros (4/9/4) to match the targets. */
export const mealTotals = (
  foods: Record<string, number>,
  catalog: Catalog,
  context: string,
): Totals => {
  const total = emptyTotals();
  for (const [foodId, grams] of Object.entries(foods)) {
    const food = catalog[foodId];
    if (food === undefined) {
      throw new Error(
        `${context}: aliment inconnu '${foodId}'. Ajoute-le dans content/foods.json ou corrige la cle.`,
      );
    }
    for (const macro of MACROS) {
      total[macro] += (food[macro] * grams) / 100;
    }
    total.price += ((food.pricePerKg ?? 0) * grams) / 1000;
  }
  total.kcal = total.protein * 4 + total.fat * 9 + total.carbs * 4;
  return total;
};

export const verdict = (
  actual: number,
  target: number,
  macro: Macro,
  tolerance: Tolerance,
): Verdict => {
  if (target <= 0) return '';
  const gap = ((actual - target) / target) * 100;
  if (Math.abs(gap) <= toleranceFor(macro, tolerance)) return 'OK';
  return gap < 0 ? 'BAS' : 'HAUT';
};

export type DayReport = { day: string; totals: Totals; details: string[] };
export type Analysis = {
  perDay: DayReport[];
  average: Totals;
  weekPrice: number;
  shopping: Record<string, number>;
  alerts: string[];
};

/** Everything the report needs, computed once and without any I/O or printing. */
export const analyse = (menu: Menu, catalog: Catalog): Analysis => {
  const { targets, days } = menu;
  const tolerance = targets.tolerancePct;
  const week = emptyTotals();
  const shopping: Record<string, number> = {};
  const alerts: string[] = [];
  const perDay: DayReport[] = [];

  for (const [day, meals] of Object.entries(days)) {
    const totals = emptyTotals();
    const details: string[] = [];
    const ordered = Object.keys(meals).sort(
      (a, b) => orderIndex(MEAL_ORDER, a) - orderIndex(MEAL_ORDER, b),
    );

    for (const mealName of ordered) {
      const meal = meals[mealName]!;
      const subtotal = mealTotals(meal.foods, catalog, `${day}/${mealName}`);
      for (const macro of MACROS) totals[macro] += subtotal[macro];
      totals.price += subtotal.price;
      for (const [foodId, grams] of Object.entries(meal.foods)) {
        shopping[foodId] = (shopping[foodId] ?? 0) + grams;
      }
      details.push(
        `  ${mealName.padEnd(13)} ${(meal.recipe ?? '').padEnd(24)} ` +
          `${round(subtotal.kcal, 4)} kcal | P ${round(subtotal.protein, 4)} ` +
          `L ${round(subtotal.fat, 4)} G ${round(subtotal.carbs, 4)}`,
      );
    }

    for (const macro of MACROS) {
      const target = targets[macro];
      if (target !== undefined && verdict(totals[macro], target, macro, tolerance) !== 'OK') {
        const gap = totals[macro] - target;
        alerts.push(`${day} — ${LABELS[macro]}: ${gap >= 0 ? '+' : ''}${Math.round(gap)} vs cible`);
      }
    }

    for (const macro of MACROS) week[macro] += totals[macro];
    week.price += totals.price;
    perDay.push({ day, totals, details });
  }

  const count = perDay.length || 1;
  const average = emptyTotals();
  for (const macro of MACROS) average[macro] = week[macro] / count;
  average.price = week.price / count;

  return { perDay, average, weekPrice: week.price, shopping, alerts };
};

const orderIndex = (order: string[], value: string): number => {
  const index = order.indexOf(value);
  return index === -1 ? 99 : index;
};
const round = (value: number, width: number): string => Math.round(value).toString().padStart(width);

const totalsLine = (title: string, totals: Totals, targets: Menu['targets']): string => {
  const cells = MACROS.map((macro) => {
    const unit = macro === 'kcal' ? '' : 'g';
    const state = verdict(totals[macro], targets[macro] ?? 0, macro, targets.tolerancePct);
    return `${LABELS[macro]} ${round(totals[macro], 5)}${unit} ${state.padEnd(4)}`;
  });
  return `${title.padEnd(12)} ${cells.join(' ')}`;
};

const main = (): number => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      courses: { type: 'boolean', default: false },
      detail: { type: 'boolean', default: false },
    },
  });
  const menuPath = positionals[0];
  if (menuPath === undefined) {
    console.error('Usage: pnpm check <menu.json> [--courses] [--detail]');
    return 2;
  }

  const catalog = loadFoods();
  // Resolve the menu path against the repo root, so the skill can pass a
  // repo-relative path (front/content/menus/X.json) whatever the CWD is.
  const menu = loadMenu(isAbsolute(menuPath) ? menuPath : join(ROOT, menuPath));
  const { targets } = menu;
  const { perDay, average, weekPrice, shopping, alerts } = analyse(menu, catalog);

  const rule = '='.repeat(78);
  const targetList = MACROS.filter((m) => targets[m] !== undefined)
    .map((m) => `${LABELS[m]} ${targets[m]} (+/-${Math.round(toleranceFor(m, targets.tolerancePct))}%)`)
    .join(', ');
  console.log(rule);
  console.log(`MENU ${menu.weekOf ?? ''} — ${perDay.length} jours — cibles: ${targetList}`);
  console.log(rule);

  for (const { day, totals, details } of perDay) {
    console.log(`\n--- ${day.toUpperCase()} ---`);
    if (values.detail) for (const line of details) console.log(line);
    console.log(totalsLine('TOTAL', totals, targets));
  }

  console.log('\n' + rule);
  console.log(totalsLine('MOYENNE/J', average, targets));
  console.log(
    `Cout estime: ${Math.round(weekPrice)} EUR pour ${perDay.length} jours ` +
      `(${average.price.toFixed(1)} EUR/jour)`,
  );

  if (alerts.length > 0) {
    console.log('\nA CORRIGER (hors tolerance):');
    for (const alert of alerts) console.log(`  - ${alert}`);
  } else {
    console.log('\nTous les jours sont dans la tolerance. Menu valide.');
  }

  if (values.courses) printShopping(shopping, catalog);
  return alerts.length > 0 ? 1 : 0;
};

const printShopping = (shopping: Record<string, number>, catalog: Catalog): void => {
  console.log('\n' + '='.repeat(78));
  console.log('LISTE DE COURSES');
  console.log('='.repeat(78));
  const byAisle = new Map<string, [string, number][]>();
  for (const [foodId, grams] of Object.entries(shopping)) {
    const aisle = catalog[foodId]?.aisle ?? 'grocery';
    (byAisle.get(aisle) ?? byAisle.set(aisle, []).get(aisle)!).push([foodId, grams]);
  }
  const aisles = [...byAisle.keys()].sort(
    (a, b) => orderIndex(AISLE_ORDER, a) - orderIndex(AISLE_ORDER, b),
  );
  for (const aisle of aisles) {
    console.log(`\n[${aisle}]`);
    for (const [foodId, grams] of byAisle.get(aisle)!.sort((a, b) => b[1] - a[1])) {
      const food = catalog[foodId]!;
      const price = ((food.pricePerKg ?? 0) * grams) / 1000;
      const unit = food.unit ?? 'g';
      const quantity =
        grams >= 1000
          ? `${(grams / 1000).toFixed(2)} ${unit === 'ml' ? 'L' : 'kg'}`
          : `${Math.round(grams)} ${unit}`;
      console.log(`  ${food.name.fr.padEnd(32)} ${quantity.padStart(9)}   ~${price.toFixed(2)} EUR`);
    }
  }
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check.ts')) {
  process.exit(main());
}
