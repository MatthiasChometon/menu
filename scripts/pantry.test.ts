import { describe, expect, it } from 'vitest';
import { keeps } from './pantry.ts';
import type { Aisle, Food } from '../front/domain/menu/types/menu.type.ts';

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
