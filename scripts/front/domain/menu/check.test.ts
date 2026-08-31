import { describe, expect, it } from 'vitest';
import type { Catalog, Menu } from '../../../lib/content.ts';
import { analyse, mealTotals, toleranceFor, verdict } from './check.ts';

const catalog: Catalog = {
  chicken: { kcal: 0, protein: 30, fat: 3, carbs: 0, fiber: 0, pricePerKg: 8, aisle: 'butcher', name: { fr: 'Poulet', en: 'Chicken' } },
  rice: { kcal: 0, protein: 7, fat: 1, carbs: 78, fiber: 1, pricePerKg: 2, aisle: 'grocery', name: { fr: 'Riz', en: 'Rice' } },
};

describe('mealTotals', () => {
  it('sums the macros of every food, scaled by grams', () => {
    const total = mealTotals({ chicken: 100, rice: 100 }, catalog, 'test');

    expect(total.protein).toBe(37);
    expect(total.fat).toBe(4);
    expect(total.carbs).toBe(78);
    expect(total.fiber).toBe(1);
  });

  it('recomputes kcal from the macros (4/9/4), ignoring the food kcal field', () => {
    const total = mealTotals({ chicken: 100, rice: 100 }, catalog, 'test');

    expect(total.kcal).toBe(37 * 4 + 4 * 9 + 78 * 4);
  });

  it('adds up the price from pricePerKg', () => {
    const total = mealTotals({ chicken: 100, rice: 100 }, catalog, 'test');

    expect(total.price).toBeCloseTo(1, 5);
  });

  it('throws, naming the meal, when a food is not in the catalog', () => {
    expect(() => mealTotals({ ghost: 50 }, catalog, 'monday/lunch')).toThrow(/monday\/lunch.*ghost/);
  });
});

describe('verdict', () => {
  it('is OK inside the tolerance band', () => {
    expect(verdict(103, 100, 'protein', 5)).toBe('OK');
  });

  it('is BAS below the band and HAUT above it', () => {
    expect(verdict(90, 100, 'protein', 5)).toBe('BAS');
    expect(verdict(110, 100, 'protein', 5)).toBe('HAUT');
  });

  it('says nothing when there is no target', () => {
    expect(verdict(50, 0, 'protein', 5)).toBe('');
  });
});

describe('toleranceFor', () => {
  it('reads a per-macro value, then a default, then falls back to 5', () => {
    expect(toleranceFor('protein', { protein: 3, default: 8 })).toBe(3);
    expect(toleranceFor('kcal', { protein: 3, default: 8 })).toBe(8);
    expect(toleranceFor('kcal', {})).toBe(5);
    expect(toleranceFor('kcal', 4)).toBe(4);
  });
});

const menu = (): Menu => ({
  weekOf: '2026-01-05',
  targets: { protein: 37, fat: 4, carbs: 78, fiber: 1, kcal: 496, tolerancePct: 5 },
  days: {
    monday: { lunch: { recipe: 'Poulet riz', foods: { chicken: 100, rice: 100 } } },
  },
});

describe('analyse', () => {
  it('flags no alert when every macro sits in tolerance', () => {
    const { alerts } = analyse(menu(), catalog);

    expect(alerts).toEqual([]);
  });

  it('raises one alert per macro that leaves the band, naming the day and the gap', () => {
    const off = menu();
    off.targets.protein = 60; // the day delivers 37, far below 60

    const { alerts } = analyse(off, catalog);

    expect(alerts).toEqual(['monday — Prot: -23 vs cible']);
  });

  it('aggregates the shopping quantities across meals', () => {
    const twoMeals = menu();
    twoMeals.days.monday!.dinner = { foods: { chicken: 150 } };

    const { shopping } = analyse(twoMeals, catalog);

    expect(shopping).toEqual({ chicken: 250, rice: 100 });
  });

  it('averages over the number of days', () => {
    const { average, perDay } = analyse(menu(), catalog);

    expect(perDay).toHaveLength(1);
    expect(average.protein).toBe(37);
  });
});
