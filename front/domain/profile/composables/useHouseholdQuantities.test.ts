import { describe, expect, it } from 'vitest';
import { sharePortions, totalOf, type Eater } from './useHouseholdQuantities';

// The targets the recipes are written against.
const menu = { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 };

const eaterOf = (id: string, targets: typeof menu): Eater => ({ id, name: id, targets });

// Two people who eat very differently: the menu's own reader, and someone on a
// far smaller allowance who still needs their protein.
const matthias = eaterOf('matthias', menu);
const mother = eaterOf('mother', { kcal: 1614, protein: 141, fat: 56, carbs: 136, fiber: 23 });

const chicken = { id: 'chicken', kcal: 165, protein: 31 } as FoodQuantity['food'];
const rice = { id: 'rice', kcal: 350, protein: 7 } as FoodQuantity['food'];

const recipe: FoodQuantity[] = [
  { food: chicken, grams: 180 },
  { food: rice, grams: 140 },
];

describe('sharing a dish between several people', () => {
  it('weighs each person their own portion of the same dish', () => {
    const [poultry] = sharePortions(recipe, menu, [matthias, mother]);

    const [his, hers] = poultry!.perEater;
    expect(his?.grams).toBe(180);
    // Protein barely comes down even though her calories are half of his: the
    // whole point of scaling protein foods separately.
    expect(hers?.grams).toBeGreaterThan(140);
    expect(hers?.grams).toBeLessThan(180);
  });

  it('cuts the starch far harder than the protein, per person', () => {
    const [, starch] = sharePortions(recipe, menu, [matthias, mother]);
    const [, hers] = starch!.perEater;

    // 1614/3150 of 140 g: the rice roughly halves where the chicken hardly moved.
    expect(hers?.grams).toBeCloseTo(72, 0);
  });

  it('puts in the pan exactly what the portions add up to', () => {
    const [poultry] = sharePortions(recipe, menu, [matthias, mother]);

    const served = poultry!.perEater.reduce((sum, { grams }): number => sum + grams, 0);
    // Not "close to": a cook who weighs the total and then serves the portions
    // must not come up short. Rounding the total on its own would do exactly
    // that, a gramme at a time, at every meal.
    expect(poultry!.total).toBe(served);
  });

  it('shows the recipe as written when there is nobody to weigh for', () => {
    const [poultry, starch] = sharePortions(recipe, menu, []);

    expect(poultry!.total).toBe(180);
    expect(starch!.total).toBe(140);
    expect(poultry!.perEater).toEqual([]);
  });

  it('shows the recipe as written when the menu has no targets of its own', () => {
    const [poultry] = sharePortions(recipe, undefined, [matthias, mother]);

    expect(poultry!.total).toBe(180);
  });

  it('leaves one person exactly where they were before the household existed', () => {
    const [poultry, starch] = sharePortions(recipe, menu, [matthias]);

    expect(poultry!.total).toBe(180);
    expect(starch!.total).toBe(140);
  });

  it('keeps a tenth of a gramme where a tenth still matters', () => {
    // Under five grammes the kitchen scale shows decimals, and so must we.
    expect(
      totalOf([
        { eater: matthias, grams: 1.2 },
        { eater: mother, grams: 0.9 },
      ]),
    ).toBe(2.1);
    expect(
      totalOf([
        { eater: matthias, grams: 120 },
        { eater: mother, grams: 61 },
      ]),
    ).toBe(181);
  });
});
