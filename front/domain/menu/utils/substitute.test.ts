import { describe, expect, it } from 'vitest';
import { gramsEquivalentTo, substitutesFor } from './substitute';
import type { Food } from '../types/menu.type';

const food = (partial: Partial<Food> & Pick<Food, 'id' | 'aisle'>): Food => ({
  name: { fr: partial.id, en: partial.id },
  icon: 'i-lucide-apple',
  unit: 'g',
  pricePerKg: 5,
  kcal: 100,
  protein: 10,
  fat: 5,
  carbs: 10,
  fiber: 2,
  micros: {
    iron: 0,
    zinc: 0,
    magnesium: 0,
    calcium: 0,
    potassium: 0,
    vitaminC: 0,
    vitaminD: 0,
    omega3: 0,
  },
  ...partial,
});

const chickenBreast = food({ id: 'chickenBreast', aisle: 'butcher', protein: 23, fat: 2, carbs: 0, kcal: 110 });
const turkeyBreast = food({ id: 'turkeyBreast', aisle: 'butcher', protein: 22, fat: 2, carbs: 0, kcal: 108 });
const leanBeef = food({ id: 'leanBeef', aisle: 'butcher', protein: 21, fat: 8, carbs: 0, kcal: 170 });
const wholeMilk = food({ id: 'wholeMilk', aisle: 'dairy', protein: 3, fat: 3, carbs: 5, kcal: 65 });
const solitarySupplement = food({ id: 'creatine', aisle: 'supplement', protein: 0, fat: 0, carbs: 0, kcal: 0 });

describe('substitutesFor', () => {
  it('ranks the closest macros first, within the same aisle', () => {
    const catalog = [chickenBreast, turkeyBreast, leanBeef, wholeMilk];

    const alternatives = substitutesFor(chickenBreast, catalog);

    expect(alternatives[0]?.id).toBe('turkeyBreast');
    expect(alternatives.every((candidate): boolean => candidate.aisle === 'butcher')).toBe(true);
  });

  it('never proposes the food itself', () => {
    const catalog = [chickenBreast, turkeyBreast];

    expect(substitutesFor(chickenBreast, catalog).map((food): string => food.id)).not.toContain(
      'chickenBreast',
    );
  });

  it('widens to the whole catalogue when its own aisle is empty', () => {
    const catalog = [solitarySupplement, chickenBreast, wholeMilk];

    const alternatives = substitutesFor(solitarySupplement, catalog);

    expect(alternatives.length).toBeGreaterThan(0);
  });
});

describe('gramsEquivalentTo', () => {
  it('scales the substitute to match the original weight in calories', () => {
    // 150 g of chicken (110 kcal/100g) is 165 kcal; leanBeef is 170 kcal/100g.
    expect(gramsEquivalentTo(chickenBreast, 150, leanBeef)).toBe(Math.round((110 * 150) / 170));
  });

  it('falls back to the original weight when the substitute has no energy', () => {
    expect(gramsEquivalentTo(chickenBreast, 150, solitarySupplement)).toBe(150);
  });
});
