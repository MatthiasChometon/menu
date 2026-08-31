// Validates a week's menu against its nutrition targets and, with --courses,
// prints the aisle-sorted shopping list. All the maths lives in the menu domain
// (buildMenu / verdict); this runner only reads the files and renders the report.
//
// Usage:
//   pnpm --dir front check content/menus/2026-08-03.json
//   pnpm --dir front check content/menus/2026-08-03.json --courses --detail
import { parseArgs } from 'node:util';
import { aisleOrder } from '../utils/catalog';
import { macroKeys, sumMacros } from '../utils/nutrition';
import { toleranceFor, verdict, type Verdict } from '../utils/target';
import type { Aisle, Day, Macros, Menu } from '../types/menu.type';
import { buildMenuAt } from './loader';

const LABELS: Record<keyof Macros, string> = {
  kcal: 'kcal',
  protein: 'Prot',
  fat: 'Lip',
  carbs: 'Gluc',
  fiber: 'Fibres',
};
const VERDICTS: Record<Verdict, string> = { ok: 'OK', low: 'BAS', high: 'HAUT' };
const AISLE_LABELS: Record<Aisle, string> = {
  butcher: 'Boucherie et poissonnerie',
  dairy: 'Cremerie',
  produce: 'Fruits et legumes',
  frozen: 'Surgeles',
  grocery: 'Epicerie',
  supplement: 'Complements',
};
const RULE = '='.repeat(78);

const pad = (value: number, width: number): string => Math.round(value).toString().padStart(width);

const totalsLine = (title: string, macros: Macros, menu: Menu): string => {
  const cells = macroKeys.map((macro): string => {
    const unit = macro === 'kcal' ? '' : 'g';
    const state = verdict(macros[macro], menu.targets[macro], macro, menu.tolerancePct);
    return `${LABELS[macro]} ${pad(macros[macro], 5)}${unit} ${(state ? VERDICTS[state] : '').padEnd(4)}`;
  });
  return `${title.padEnd(12)} ${cells.join(' ')}`;
};

const mealLines = (day: Day): string[] =>
  day.meals.map(
    (meal): string =>
      `  ${meal.slot.padEnd(13)} ${meal.recipe.name.fr.padEnd(24)} ` +
      `${pad(meal.macros.kcal, 4)} kcal | P ${pad(meal.macros.protein, 4)} ` +
      `L ${pad(meal.macros.fat, 4)} G ${pad(meal.macros.carbs, 4)}`,
  );

const averageOf = (days: Day[]): Macros => {
  const week = sumMacros(days.map((day): Macros => day.macros));
  const count = Math.max(1, days.length);
  return {
    kcal: week.kcal / count,
    protein: week.protein / count,
    fat: week.fat / count,
    carbs: week.carbs / count,
    fiber: week.fiber / count,
  };
};

const alertsOf = (menu: Menu): string[] =>
  menu.days.flatMap((day): string[] =>
    macroKeys
      .filter((macro): boolean => verdict(day.macros[macro], menu.targets[macro], macro, menu.tolerancePct) !== 'ok')
      .map((macro): string => {
        const gap = day.macros[macro] - menu.targets[macro];
        return `${day.key} — ${LABELS[macro]}: ${gap >= 0 ? '+' : ''}${Math.round(gap)} vs cible`;
      }),
  );

const printReport = (menu: Menu, detail: boolean): void => {
  const targetList = macroKeys
    .map((macro): string => `${LABELS[macro]} ${menu.targets[macro]} (+/-${Math.round(toleranceFor(macro, menu.tolerancePct))}%)`)
    .join(', ');

  console.log(RULE);
  console.log(`MENU ${menu.weekOf} — ${menu.days.length} jours — cibles: ${targetList}`);
  console.log(RULE);

  for (const day of menu.days) {
    console.log(`\n--- ${day.key.toUpperCase()} ---`);
    if (detail) for (const line of mealLines(day)) console.log(line);
    console.log(totalsLine('TOTAL', day.macros, menu));
  }

  console.log('\n' + RULE);
  console.log(totalsLine('MOYENNE/J', averageOf(menu.days), menu));
  console.log(
    `Cout estime: ${Math.round(menu.totalPrice)} EUR pour ${menu.days.length} jours ` +
      `(${(menu.totalPrice / Math.max(1, menu.days.length)).toFixed(1)} EUR/jour)`,
  );
};

const printShopping = (menu: Menu): void => {
  console.log('\n' + RULE);
  console.log('LISTE DE COURSES');
  console.log(RULE);

  for (const aisle of aisleOrder) {
    const lines = menu.shoppingList.filter((line): boolean => line.food.aisle === aisle);
    if (lines.length === 0) continue;

    console.log(`\n[${AISLE_LABELS[aisle]}]`);
    for (const line of lines) {
      const unit = line.food.unit === 'ml' ? 'L' : 'kg';
      const quantity =
        line.grams >= 1000 ? `${(line.grams / 1000).toFixed(2)} ${unit}` : `${line.grams} ${line.food.unit}`;
      console.log(`  ${line.food.name.fr.padEnd(32)} ${quantity.padStart(9)}   ~${line.price.toFixed(2)} EUR`);
    }
  }
};

const main = (): number => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { courses: { type: 'boolean', default: false }, detail: { type: 'boolean', default: false } },
  });

  const menuPath = positionals[0];
  if (menuPath === undefined) {
    console.error('Usage: pnpm --dir front check <menu.json> [--courses] [--detail]');
    return 2;
  }

  const menu = buildMenuAt(menuPath);
  printReport(menu, values.detail);

  const alerts = alertsOf(menu);
  if (alerts.length > 0) {
    console.log('\nA CORRIGER (hors tolerance):');
    for (const alert of alerts) console.log(`  - ${alert}`);
  } else {
    console.log('\nTous les jours sont dans la tolerance. Menu valide.');
  }

  if (values.courses) printShopping(menu);
  return alerts.length > 0 ? 1 : 0;
};

if (process.argv[1]?.endsWith('check.ts')) process.exit(main());
