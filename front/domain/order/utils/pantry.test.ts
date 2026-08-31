import { describe, expect, it } from 'vitest';
import { keeps, leftover } from './pantry';
import type { Aisle, Food } from '../../menu/types/menu.type';

const food = (id: string, aisle: Aisle): Food => ({
  id,
  name: { fr: id, en: id },
  aisle,
  icon: 'i',
  unit: 'g',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg: 0,
  micros: { iron: 0, zinc: 0, magnesium: 0, calcium: 0, potassium: 0, vitaminC: 0, vitaminD: 0, omega3: 0 },
});

describe('keeps', () => {
  it('keeps a cupboard staple from one week to the next', () => {
    expect(keeps(food('rice', 'grocery'))).toBe(true);
  });

  it('does not keep meat or fish', () => {
    expect(keeps(food('chicken', 'butcher'))).toBe(false);
  });

  it('does not keep fresh produce', () => {
    expect(keeps(food('banana', 'produce'))).toBe(false);
  });

  it('does not keep a dairy item that spoils fast', () => {
    expect(keeps(food('skyr', 'dairy'))).toBe(false);
  });
});

describe('leftover', () => {
  it('carries over the surplus of a whole pack', () => {
    expect(leftover(0, 1000, 960)).toBe(40);
  });

  it('adds what the pantry already held', () => {
    expect(leftover(200, 500, 300)).toBe(400);
  });

  it('never goes negative when the need outruns what was bought', () => {
    expect(leftover(0, 500, 800)).toBe(0);
  });
});
