import { describe, expect, it } from 'vitest';
import type { Catalog, Food } from '../../../lib/content.ts';
import { buildLines, describe as describeLine, pantryStock } from './order.ts';

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
  rice: food({ aisle: 'grocery', unit: 'g', pack: 1000, pricePerKg: 2, name: { fr: 'Riz', en: 'Rice' } }),
  banana: food({ aisle: 'produce', unit: 'g', pieceWeight: 120, name: { fr: 'Banane', en: 'Banana' } }),
  chicken: food({ aisle: 'butcher', unit: 'g', pricePerKg: 8, name: { fr: 'Poulet', en: 'Chicken' } }),
};

describe('pantryStock', () => {
  it('is empty when there is no pantry', () => {
    expect(pantryStock(undefined, '2026-01-05')).toEqual({});
  });

  it('ignores stock whose week is not strictly before the ordered week', () => {
    expect(pantryStock({ afterWeek: '2026-01-05', items: { rice: 80 } }, '2026-01-05')).toEqual({});
  });

  it('applies stock left by an earlier week', () => {
    expect(pantryStock({ afterWeek: '2025-12-29', items: { rice: 80 } }, '2026-01-05')).toEqual({
      rice: 80,
    });
  });
});

describe('buildLines', () => {
  it('rounds a packaged need up to whole packs', () => {
    const [rice] = buildLines({ rice: 960 }, catalog, {});
    expect(rice).toMatchObject({ kind: 'pack', quantity: 1, pack: 1000 });
  });

  it('orders piece-priced produce by the unit', () => {
    const [banana] = buildLines({ banana: 300 }, catalog, {});
    expect(banana).toMatchObject({ kind: 'piece', quantity: 3 });
  });

  it('orders unpackaged items by weight', () => {
    const [chicken] = buildLines({ chicken: 500 }, catalog, {});
    expect(chicken).toMatchObject({ kind: 'weight', quantity: 500, price: 4 });
  });

  it('deducts stock and drops a line fully covered by it', () => {
    const lines = buildLines({ rice: 960 }, catalog, { rice: 1000 });
    expect(lines).toEqual([]);
  });

  it('sorts by aisle order, then by price descending', () => {
    const lines = buildLines({ rice: 960, banana: 300, chicken: 500 }, catalog, {});
    expect(lines.map((line) => line.id)).toEqual(['chicken', 'banana', 'rice']);
  });
});

describe('describe', () => {
  it('names the pack count and the need, plus any stock', () => {
    const [rice] = buildLines({ rice: 2000 }, catalog, { rice: 400 });
    // afterWeek guard is the caller's job; here stock is applied directly.
    expect(describeLine(rice!)).toContain('deja en stock');
    expect(describeLine(rice!)).toMatch(/x 1000 g/);
  });
});
