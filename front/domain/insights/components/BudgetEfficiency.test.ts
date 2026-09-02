import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import BudgetEfficiency from './BudgetEfficiency.vue';
import type { Day, DayKey, Food, MealSlot, Menu, Recipe } from '../../menu/types/menu.type';

const menuWith = (
  weekOf: string,
  totalPrice: number,
  days: Day[] = [],
  recipes: Recipe[] = [],
): Menu => ({
  weekOf,
  targets: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  tolerancePct: { default: 5 },
  days,
  recipes,
  shoppingList: [],
  freshSeasonings: [],
  totalPrice,
});

mockNuxtImport(
  'useMenu',
  () =>
    (): {
      menus: Menu[];
      latestMenu: Menu | undefined;
      menuOf: (weekOf: string) => Menu | undefined;
      dayOrder: readonly DayKey[];
      mealOrder: readonly MealSlot[];
    } => ({
      menus: [menuWith('2026-08-03', 80), menuWith('2026-08-10', 95)],
      latestMenu: undefined,
      menuOf: (): undefined => undefined,
      dayOrder: [],
      mealOrder: [],
    }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('BudgetEfficiency', () => {
  it('invites to view the week when there is no menu to analyse', async () => {
    const wrapper = await mountSuspended(BudgetEfficiency, { props: { menu: undefined } });

    expect(wrapper.text()).toContain('Pas de semaine à analyser');
  });

  it('prices the protein and names the best-value dish for the given week', async () => {
    const food: Food = {
      id: 'chicken',
      name: { fr: 'Poulet', en: 'Chicken' },
      aisle: 'butcher',
      icon: 'i-lucide-drumstick',
      unit: 'g',
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      pricePerKg: 10,
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
    };
    const recipe: Recipe = {
      id: 'roast-chicken',
      slot: 'main',
      name: { fr: 'Poulet rôti', en: 'Roast chicken' },
      prepMinutes: 10,
      batch: false,
      ingredients: {},
      seasonings: [],
      steps: { fr: [], en: [] },
    };
    const meal: Day['meals'][number] = {
      slot: 'lunch',
      recipe,
      quantities: [{ food, grams: 200 }],
      macros: { kcal: 160, protein: 40, fat: 0, carbs: 0, fiber: 0 },
      portionRatio: 1,
    };
    const day: Day = { key: 'monday', meals: [meal], macros: meal.macros };
    const menu = menuWith('2026-08-03', 8, [day], [recipe]);

    const wrapper = await mountSuspended(BudgetEfficiency, { props: { menu } });

    expect(wrapper.text()).toContain('20.00 €');
    expect(wrapper.text()).toContain('Poulet rôti');
  });

  it('shows the budget evolution once several published weeks exist', async () => {
    const wrapper = await mountSuspended(BudgetEfficiency, {
      props: { menu: menuWith('2026-08-03', 80) },
    });

    expect(wrapper.text()).toContain('Évolution du budget');
  });
});
