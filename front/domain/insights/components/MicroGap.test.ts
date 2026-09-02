import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import MicroGap from './MicroGap.vue';
import type { Aisle, Day, Food, Menu, Micros, Recipe } from '../../menu/types/menu.type';

// A food that meets every daily target exactly at 100 g except iron, which is
// deliberately left low so it — and only it — stands out as the week's gap.
const fullTargetMicros = (overrides: Partial<Micros> = {}): Micros => ({
  iron: 11,
  zinc: 15,
  magnesium: 450,
  calcium: 1200,
  potassium: 4000,
  vitaminC: 150,
  vitaminD: 50,
  omega3: 2,
  ...overrides,
});

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
  micros: fullTargetMicros(micros),
});

const lowIronFood = foodWith('rice', 'grocery', { iron: 1 });
const beef = foodWith('beef', 'butcher', { iron: 5 });

mockNuxtImport(
  'useFoods',
  () =>
    (): {
      foods: Record<string, Food>;
      foodOf: (id: string) => Food | undefined;
      aisleOrder: readonly Aisle[];
      imageOf: (food: Food) => string | undefined;
    } => ({
      foods: { rice: lowIronFood, beef },
      foodOf: (): undefined => undefined,
      aisleOrder: [],
      imageOf: (): undefined => undefined,
    }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

const recipe: Recipe = {
  id: 'r',
  slot: 'main',
  name: { fr: 'x', en: 'x' },
  prepMinutes: 0,
  batch: false,
  ingredients: {},
  seasonings: [],
  steps: { fr: [], en: [] },
};

const dayEating = (food: Food, grams: number): Day => {
  const macros = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  return {
    key: 'monday',
    macros,
    meals: [{ slot: 'lunch', recipe, quantities: [{ food, grams }], macros, portionRatio: 1 }],
  };
};

const menuWith = (days: Day[]): Menu => ({
  weekOf: '2026-08-03',
  targets: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  tolerancePct: { default: 5 },
  days,
  recipes: [],
  shoppingList: [],
  freshSeasonings: [],
  totalPrice: 0,
});

describe('MicroGap', () => {
  it('says nothing is missing without a week to check', async () => {
    const wrapper = await mountSuspended(MicroGap, { props: { menu: undefined } });

    expect(wrapper.text()).toContain('Rien à signaler');
  });

  it('names the recurring low nutrient and suggests a real food to close the gap', async () => {
    const menu = menuWith([dayEating(lowIronFood, 100)]);

    const wrapper = await mountSuspended(MicroGap, { props: { menu } });

    expect(wrapper.text()).toContain('Fer');
    expect(wrapper.text()).toContain('beef');
  });
});
