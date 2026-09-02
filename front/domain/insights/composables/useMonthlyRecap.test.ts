import { describe, expect, it } from 'vitest';
import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { Menu, Recipe } from '../../menu/types/menu.type';
import type { WeightEntry } from '../../weight/types/weight.type';

const weigh = (date: string, kg: number): WeightEntry => ({ id: date, date, kg });

const week = (weekOf: string, rate: number): WeekAdherence => ({
  weekOf,
  rate,
  eatenCount: Math.round(rate * 10),
  totalCount: 10,
});

const recipeWith = (id: string): Recipe => ({
  id,
  slot: 'main',
  name: { fr: id, en: id },
  prepMinutes: 10,
  batch: false,
  ingredients: {},
  seasonings: [],
  steps: { fr: [], en: [] },
});

const menuWith = (weekOf: string, recipes: Recipe[], totalPrice: number): Menu => ({
  weekOf,
  targets: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  tolerancePct: { default: 5 },
  days: [],
  recipes,
  shoppingList: [],
  freshSeasonings: [],
  totalPrice,
});

describe('useMonthlyRecap', () => {
  it('has nothing to summarise with neither a weigh-in nor a tallied week', () => {
    const { recapOf } = useMonthlyRecap();

    expect(
      recapOf(
        [],
        [],
        () => undefined,
        () => 0,
      ),
    ).toBeUndefined();
  });

  it('gains the weight between the first and last weigh-in of the month', () => {
    const { recapOf } = useMonthlyRecap();

    const recap = recapOf(
      [],
      [weigh('2026-08-01', 80), weigh('2026-08-15', 81.2)],
      () => undefined,
      () => 0,
    );

    expect(recap?.weightGainedKg).toBeCloseTo(1.2);
  });

  it('averages the adherence rate across every tallied week', () => {
    const { recapOf } = useMonthlyRecap();

    const recap = recapOf(
      [week('2026-08-03', 1), week('2026-08-10', 0.5)],
      [],
      () => undefined,
      () => 0,
    );

    expect(recap?.averageAdherenceRate).toBeCloseTo(0.75);
  });

  it('averages the budget only across weeks that still have a menu', () => {
    const { recapOf } = useMonthlyRecap();
    const menu = menuWith('2026-08-03', [], 90);

    const recap = recapOf(
      [week('2026-08-03', 1), week('2026-08-10', 1)],
      [],
      (weekOf) => (weekOf === '2026-08-03' ? menu : undefined),
      () => 0,
    );

    expect(recap?.averageBudget).toBe(90);
  });

  it('ranks the two most eaten dishes across the tallied weeks', () => {
    const { recapOf } = useMonthlyRecap();
    const stew = recipeWith('lentil-stew');
    const bowl = recipeWith('salmon-bowl');
    const salad = recipeWith('side-salad');
    const menu = menuWith('2026-08-03', [stew, bowl, salad], 0);

    const recap = recapOf(
      [week('2026-08-03', 1)],
      [],
      () => menu,
      (_weekOf, _menu, recipeId) =>
        ({ 'lentil-stew': 4, 'salmon-bowl': 2, 'side-salad': 0 })[recipeId] ?? 0,
    );

    expect(recap?.favoriteDishes.map((recipe) => recipe.id)).toEqual([
      'lentil-stew',
      'salmon-bowl',
    ]);
  });
});
