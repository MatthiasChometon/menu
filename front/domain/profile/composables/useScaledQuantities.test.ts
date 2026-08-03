import { describe, expect, it } from 'vitest';
import { useScaledQuantities } from './useScaledQuantities';

const { isProteinFood, scaleFor, scaleQuantity } = useScaledQuantities();

// The targets the recipes are written against.
const menu = { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 };
// Someone eating far less, and losing weight: protein stays high while the
// calories come down. This is the case a single ratio would get wrong.
const slimming = { kcal: 1614, protein: 141, fat: 56, carbs: 136, fiber: 23 };

const chicken = { kcal: 165, protein: 31 };
const rice = { kcal: 350, protein: 7 };

describe('useScaledQuantities', () => {
  it('recognises a protein source by what carries its energy', () => {
    expect(isProteinFood(chicken)).toBe(true);
    expect(isProteinFood(rice)).toBe(false);
  });

  it('keeps protein up while cutting the starch, on a smaller allowance', () => {
    const chickenScale = scaleFor(chicken, menu, slimming);
    const riceScale = scaleFor(rice, menu, slimming);

    // 141/165 against 1614/3150: the chicken barely moves, the rice halves.
    expect(chickenScale).toBeGreaterThan(riceScale);
    expect(chickenScale).toBeCloseTo(0.85, 1);
    expect(riceScale).toBeCloseTo(0.51, 1);
  });

  it('leaves a recipe untouched for whoever the menu was written for', () => {
    expect(scaleQuantity(150, chicken, menu, menu)).toBe(150);
    expect(scaleQuantity(80, rice, menu, menu)).toBe(80);
  });

  it('rounds to the gram, and to a tenth for the small amounts', () => {
    expect(scaleQuantity(150, chicken, menu, slimming)).toBe(128);
    // Spices and oils: 4 g must not collapse to 2 or jump to 3.
    expect(scaleQuantity(4, rice, menu, slimming)).toBeCloseTo(2, 0);
    expect(Number.isInteger(scaleQuantity(4, rice, menu, slimming) * 10)).toBe(true);
  });

  it('falls back to leaving quantities alone when the menu has no targets', () => {
    const empty = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

    expect(scaleFor(chicken, empty, slimming)).toBe(1);
  });
});
