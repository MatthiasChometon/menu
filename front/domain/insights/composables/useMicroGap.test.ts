import { describe, expect, it } from 'vitest';
import type { Day, Food, Macros, Menu, Micros } from '../../menu/types/menu.type';

const emptyMicros = (overrides: Partial<Micros> = {}): Micros => ({
  iron: 0,
  zinc: 0,
  magnesium: 0,
  calcium: 0,
  potassium: 0,
  vitaminC: 0,
  vitaminD: 0,
  omega3: 0,
  ...overrides,
});

const macros: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

const foodWith = (id: string, aisle: Food['aisle'], micros: Partial<Micros>): Food => ({
  id,
  name: { fr: id, en: id },
  aisle,
  icon: 'i-lucide-wheat',
  unit: 'g',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg: 0,
  micros: emptyMicros(micros),
});

const dayEatingOnly = (food: Food, grams: number): Day => ({
  key: 'monday',
  macros,
  meals: [
    {
      slot: 'lunch',
      recipe: {
        id: 'r',
        slot: 'main',
        name: { fr: '', en: '' },
        prepMinutes: 0,
        batch: false,
        ingredients: {},
        seasonings: [],
        steps: { fr: [], en: [] },
      },
      quantities: [{ food, grams }],
      macros,
      portionRatio: 1,
    },
  ],
});

describe('useMicroGap', () => {
  it('says nothing when every micronutrient clears the week comfortably', () => {
    const { gapOf } = useMicroGap();
    const richFood = foodWith('salmon', 'butcher', {
      iron: 11,
      zinc: 15,
      magnesium: 450,
      calcium: 1200,
      potassium: 4000,
      vitaminC: 150,
      vitaminD: 50,
      omega3: 2,
    });
    const menu: Menu = {
      weekOf: '2026-08-03',
      targets: macros,
      tolerancePct: { default: 5 },
      days: [dayEatingOnly(richFood, 100)],
      recipes: [],
      shoppingList: [],
      freshSeasonings: [],
      totalPrice: 0,
    };

    expect(gapOf(menu, [richFood])).toBeUndefined();
  });

  it('names the micronutrient that stays low across the week', () => {
    const { gapOf } = useMicroGap();
    // Every target but iron is met exactly by this food, so iron alone
    // stands out as the recurring gap.
    const lowIronFood = foodWith('mostly-covered', 'grocery', {
      iron: 1,
      zinc: 15,
      magnesium: 450,
      calcium: 1200,
      potassium: 4000,
      vitaminC: 150,
      vitaminD: 50,
      omega3: 2,
    });
    const menu: Menu = {
      weekOf: '2026-08-03',
      targets: macros,
      tolerancePct: { default: 5 },
      days: [dayEatingOnly(lowIronFood, 100), dayEatingOnly(lowIronFood, 100)],
      recipes: [],
      shoppingList: [],
      freshSeasonings: [],
      totalPrice: 0,
    };

    expect(gapOf(menu, [lowIronFood])?.key).toBe('iron');
  });

  it('suggests the richest real food for that nutrient, never a supplement', () => {
    const { gapOf } = useMicroGap();
    const lowIronFood = foodWith('mostly-covered', 'grocery', {
      iron: 1,
      zinc: 15,
      magnesium: 450,
      calcium: 1200,
      potassium: 4000,
      vitaminC: 150,
      vitaminD: 50,
      omega3: 2,
    });
    const beef = foodWith('beef', 'butcher', { iron: 3 });
    const supplement = foodWith('iron-pills', 'supplement', { iron: 100 });
    const menu: Menu = {
      weekOf: '2026-08-03',
      targets: macros,
      tolerancePct: { default: 5 },
      days: [dayEatingOnly(lowIronFood, 100)],
      recipes: [],
      shoppingList: [],
      freshSeasonings: [],
      totalPrice: 0,
    };

    expect(gapOf(menu, [lowIronFood, beef, supplement])?.suggestion?.id).toBe('beef');
  });

  it('has nothing to flag with no day in the menu', () => {
    const { gapOf } = useMicroGap();
    const menu: Menu = {
      weekOf: '2026-08-03',
      targets: macros,
      tolerancePct: { default: 5 },
      days: [],
      recipes: [],
      shoppingList: [],
      freshSeasonings: [],
      totalPrice: 0,
    };

    expect(gapOf(menu, [])).toBeUndefined();
  });
});
