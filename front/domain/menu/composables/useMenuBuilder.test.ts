import { describe, expect, it } from 'vitest';
import { buildMenuAt } from '../scripts/loader';

// Pins the numbers a real published week builds to. The nutrition targets are what
// the reader acts on, so this was run against the pre-refactor utils/ code too and
// gave the same figures (the check and order script outputs were diffed as well).
const WEEK = 'domain/menu/content/menus/2026-08-03.json';

describe('a published week', () => {
  const menu = buildMenuAt(WEEK);

  it('builds the same totals as before the refactor', () => {
    expect(menu.totalPrice).toBeCloseTo(85.34, 2);
    expect(menu.shoppingList).toHaveLength(32);
    expect(menu.recipes).toHaveLength(12);
  });

  it.each([
    ['monday', 3160.43, 165.17, 80.67, 443.43, 55.96],
    ['tuesday', 3151.49, 164.56, 79.4, 444.67, 54.09],
    ['wednesday', 3163.58, 165.13, 80.17, 445.37, 56.08],
    ['thursday', 3160.43, 165.17, 80.67, 443.43, 55.96],
    ['friday', 3151.49, 164.56, 79.4, 444.67, 54.09],
    ['saturday', 3163.58, 165.13, 80.17, 445.37, 56.08],
    ['sunday', 3160.43, 165.17, 80.67, 443.43, 55.96],
  ])('weighs %s at the same macros', (key, kcal, protein, fat, carbs, fiber) => {
    const day = menu.days.find((candidate): boolean => candidate.key === key);

    expect(day?.macros.kcal).toBeCloseTo(kcal, 1);
    expect(day?.macros.protein).toBeCloseTo(protein, 1);
    expect(day?.macros.fat).toBeCloseTo(fat, 1);
    expect(day?.macros.carbs).toBeCloseTo(carbs, 1);
    expect(day?.macros.fiber).toBeCloseTo(fiber, 1);
  });
});
