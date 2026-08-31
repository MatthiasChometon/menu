import { describe, expect, it } from 'vitest';
import { describe as describeLine, orderLine } from './order.ts';
import type { Food } from '../front/domain/menu/types/menu.type.ts';

const food = (overrides: Partial<Food>): Food => ({
  id: 'x',
  name: { fr: 'X', en: 'X' },
  aisle: 'grocery',
  icon: 'i',
  unit: 'g',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg: 0,
  micros: { iron: 0, zinc: 0, magnesium: 0, calcium: 0, potassium: 0, vitaminC: 0, vitaminD: 0, omega3: 0 },
  ...overrides,
});

describe('orderLine', () => {
  it('rounds a weight need up to whole packs', () => {
    const line = orderLine(food({ id: 'rice' }), 960, {}, { rice: 1000 });

    expect(line?.kind).toBe('pack');
    expect(line?.quantity).toBe(1);
  });

  it('rounds up to whole pieces for what is bought by the unit', () => {
    const line = orderLine(food({ id: 'banana', pieceWeight: 115 }), 1720, {}, {});

    expect(line?.kind).toBe('piece');
    expect(line?.quantity).toBe(15);
  });

  it('orders by weight when there is neither pack nor piece', () => {
    const line = orderLine(food({ id: 'oats' }), 500, {}, {});

    expect(line?.kind).toBe('weight');
    expect(line?.quantity).toBe(500);
  });

  it('deducts what the pantry still holds', () => {
    const line = orderLine(food({ id: 'rice' }), 960, { rice: 500 }, { rice: 1000 });

    expect(line?.needed).toBe(460);
    expect(line?.inStock).toBe(500);
  });

  it('drops a food already covered by the pantry', () => {
    expect(orderLine(food({ id: 'rice' }), 400, { rice: 500 }, {})).toBeUndefined();
  });

  it('prices the quantity from its cost per kilo', () => {
    const line = orderLine(food({ id: 'salmon', pricePerKg: 22 }), 240, {}, {});

    expect(line?.price).toBeCloseTo(5.28);
  });
});

describe('describeLine', () => {
  it('reads a pack line with its need', () => {
    const line = orderLine(food({ id: 'rice' }), 960, {}, { rice: 1000 });

    expect(describeLine(line!)).toBe('1 x 1000 g (besoin 960 g)');
  });
});
