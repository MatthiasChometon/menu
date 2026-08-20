import { beforeEach, describe, expect, it } from 'vitest';
import { BasketTargetService } from './target.service';
import { KnownProduct } from './type';

const RICE: KnownProduct = { ean: '3560070510771', name: 'Brown rice', size: 500 };
const MILK: KnownProduct = { ean: '3270190207443', name: 'Whole milk', size: 1000 };

let service: BasketTargetService;

beforeEach((): void => {
  service = new BasketTargetService();
});

describe('turning a week into a basket', () => {
  it('buys whole units, rounding up', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 960 }],
      new Map(),
      new Map([['brownRice', RICE]]),
    );

    expect(lines).toEqual([
      expect.objectContaining({ foodId: 'brownRice', units: 2, grams: 960, fromPantry: 0 }),
    ]);
  });

  it('buys one unit for the smallest need', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 20 }],
      new Map(),
      new Map([['brownRice', RICE]]),
    );

    expect(lines[0].units).toBe(1);
  });

  it('takes the pantry off before counting units', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 960 }],
      new Map([['brownRice', 500]]),
      new Map([['brownRice', RICE]]),
    );

    expect(lines[0]).toEqual(expect.objectContaining({ units: 1, fromPantry: 500, grams: 960 }));
  });

  it('leaves out what the cupboard already covers', () => {
    const lines = service.linesFor(
      [
        { foodId: 'brownRice', grams: 400 },
        { foodId: 'wholeMilk', grams: 2000 },
      ],
      new Map([['brownRice', 600]]),
      new Map([
        ['brownRice', RICE],
        ['wholeMilk', MILK],
      ]),
    );

    expect(lines.map((line): string => line.foodId)).toEqual(['wholeMilk']);
  });

  it('never counts more pantry than the menu eats', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 300 }],
      new Map([['brownRice', 5000]]),
      new Map([['brownRice', RICE]]),
    );

    expect(lines).toEqual([]);
  });

  it('keeps a line whose product is not known yet, so the run goes looking', () => {
    const lines = service.linesFor([{ foodId: 'tofu', grams: 400 }], new Map(), new Map());

    expect(lines).toEqual([expect.objectContaining({ foodId: 'tofu', grams: 400 })]);
    expect(lines[0].units).toBeUndefined();
  });
});

describe('what stays in the cupboard', () => {
  it('counts what was bought over what was eaten', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 960 }],
      new Map(),
      new Map([['brownRice', RICE]]),
    );

    expect(service.leftoversAfter(lines).get('brownRice')).toBe(40);
  });

  it('carries over what the cupboard had already', () => {
    const lines = service.linesFor(
      [{ foodId: 'brownRice', grams: 960 }],
      new Map([['brownRice', 500]]),
      new Map([['brownRice', RICE]]),
    );

    expect(service.leftoversAfter(lines).get('brownRice')).toBe(40);
  });

  it('says nothing about a food whose product is unknown', () => {
    const lines = service.linesFor([{ foodId: 'tofu', grams: 400 }], new Map(), new Map());

    expect(service.leftoversAfter(lines).has('tofu')).toBe(false);
  });
});
