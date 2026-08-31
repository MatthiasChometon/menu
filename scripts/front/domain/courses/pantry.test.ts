import { describe, expect, it } from 'vitest';
import type { Catalog, Food } from '../../../lib/content.ts';
import { computePantry, keeps } from './pantry.ts';

const food = (over: Partial<Food>): Food => ({
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  name: { fr: over.name?.fr ?? 'X', en: 'X' },
  ...over,
});

const catalog: Catalog = {
  rice: food({ aisle: 'grocery', unit: 'g', name: { fr: 'Riz', en: 'Rice' } }),
  oil: food({ aisle: 'grocery', unit: 'ml', name: { fr: 'Huile', en: 'Oil' } }),
  chicken: food({ aisle: 'butcher', unit: 'g', name: { fr: 'Poulet', en: 'Chicken' } }),
};

describe('keeps', () => {
  it('keeps a shelf-stable grocery item', () => {
    expect(keeps('rice', catalog.rice!)).toBe(true);
  });

  it('does not keep a perishable aisle (butcher/produce)', () => {
    expect(keeps('chicken', catalog.chicken!)).toBe(false);
  });

  it('does not keep an id on the perishable list (e.g. skyr)', () => {
    expect(keeps('skyr', food({ aisle: 'dairy' }))).toBe(false);
  });
});

describe('computePantry', () => {
  const bought = {
    rice: { size: 1000, units: 1, name: 'Riz 1kg' },
    oil: { size: 500, units: 1, name: 'Huile 50cl' },
    chicken: { size: 500, units: 1, name: 'Poulet 500g' },
  };
  const needs = { rice: 960, oil: 114, chicken: 300 };

  it('left = previous stock + purchased - used', () => {
    const rows = computePantry(needs, catalog, bought, { rice: 80 });
    const rice = rows.find((row) => row.id === 'rice')!;

    expect(rice.left).toBe(80 + 1000 - 960);
    expect(rice.used).toBe(960);
    expect(rice.purchased).toBe(1000);
  });

  it('never reports a negative surplus', () => {
    const rows = computePantry({ rice: 5000 }, catalog, bought, {});
    const rice = rows.find((row) => row.id === 'rice')!;

    expect(rice.left).toBe(0);
  });

  it('lists keepers first, then by biggest surplus', () => {
    const rows = computePantry(needs, catalog, bought, { rice: 80 });

    // oil (386, keeps) before rice (120, keeps) before chicken (perishable).
    expect(rows.map((row) => row.id)).toEqual(['oil', 'rice', 'chicken']);
  });

  it('skips metadata keys prefixed with _', () => {
    const rows = computePantry(needs, catalog, { _note: { size: 0, units: 0, name: '' }, ...bought }, {});

    expect(rows.some((row) => row.id === '_note')).toBe(false);
  });
});
