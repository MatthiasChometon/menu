import { describe, expect, it } from 'vitest';
import { sharePortions } from '../../profile/composables/useHouseholdQuantities';
import type { Eater } from '../../profile/composables/useHouseholdQuantities';

// The arithmetic the shopping list now leans on, checked where it lives: the
// list fills the pan, the recipe page serves out of it, and both have to agree.
const MENU_TARGETS = { kcal: 3000, protein: 150, fat: 80, carbs: 400, fiber: 50 };

const eater = (id: string, kcal: number): Eater => ({
  id,
  name: id,
  targets: { kcal, protein: 150, fat: 80, carbs: 400, fiber: 50 },
});

const only = (
  lines: ReturnType<typeof sharePortions>,
): ReturnType<typeof sharePortions>[number] => {
  const [line] = lines;
  if (line === undefined) throw new Error('sharePortions dropped the only line it was given.');

  return line;
};

const RICE = {
  food: { id: 'brownRice', kcal: 350, protein: 7 } as never,
  grams: 100,
};

describe('filling the pan for everyone who eats out of it', () => {
  it('leaves the menu untouched when there is nobody to weigh for', () => {
    const line = only(sharePortions([RICE], MENU_TARGETS, []));

    expect(line.total).toBe(100);
    expect(line.perEater).toEqual([]);
  });

  it('asks for one share when a single person eats', () => {
    const line = only(sharePortions([RICE], MENU_TARGETS, [eater('me', 3000)]));

    expect(line.total).toBe(100);
  });

  // The whole point: three people eating means three portions bought, not one.
  it('adds up to more than one portion once the household grows', () => {
    const line = only(
      sharePortions([RICE], MENU_TARGETS, [
        eater('me', 3000),
        eater('other', 3000),
        eater('third', 3000),
      ]),
    );

    expect(line.total).toBe(300);
  });

  it('gives a smaller eater a smaller share, and buys accordingly', () => {
    const line = only(
      sharePortions([RICE], MENU_TARGETS, [eater('me', 3000), eater('small', 1500)]),
    );

    expect(line.total).toBeGreaterThan(100);
    expect(line.total).toBeLessThan(200);
  });

  // Rounding the total on its own would leave the parts not adding up to what
  // is in the pan, and somebody short at every meal.
  it('totals the rounded shares rather than rounding the total', () => {
    const line = only(sharePortions([RICE], MENU_TARGETS, [eater('a', 2000), eater('b', 2000)]));
    const sum = line.perEater.reduce((running, { grams }): number => running + grams, 0);

    expect(line.total).toBe(sum);
  });
});
