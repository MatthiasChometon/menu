import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannerPreferences } from './usePlannerPreferences';
import type { Recipe, RecipeSlot } from '~~/domain/menu/types/menu.type';

const noPreferences = (): PlannerPreferences => ({
  excludedKinds: [],
  maxPrepMinutes: undefined,
  maxRepeatsPerWeek: undefined,
  weeklyBudget: undefined,
});

const state = vi.hoisted(
  (): { recipes: Record<string, unknown>; preferences: { value: unknown } } => ({
    recipes: {},
    preferences: { value: undefined },
  }),
);

mockNuxtImport(
  'useRecipes',
  () =>
    (): {
      recipes: Record<string, Recipe>;
      recipeOf: (id: string) => Recipe | undefined;
      imageOf: () => undefined;
    } => ({
      recipes: state.recipes as Record<string, Recipe>,
      recipeOf: (id: string): Recipe | undefined => (state.recipes as Record<string, Recipe>)[id],
      imageOf: (): undefined => undefined,
    }),
);
mockNuxtImport(
  'usePlannerPreferences',
  () => (): { preferences: { value: PlannerPreferences } } => ({
    preferences: state.preferences as { value: PlannerPreferences },
  }),
);

const buildRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'recipe',
  slot: 'main',
  name: { fr: 'Plat', en: 'Dish' },
  prepMinutes: 30,
  batch: false,
  ingredients: { rice: 100 },
  seasonings: [],
  steps: { fr: [], en: [] },
  ...overrides,
});

const catalog = (list: Recipe[]): Record<string, Recipe> =>
  Object.fromEntries(list.map((recipe): [string, Recipe] => [recipe.id, recipe]));

describe('classifying and pooling the dishes the composer draws from', (): void => {
  beforeEach((): void => {
    state.recipes = {};
    state.preferences = { value: noPreferences() };
  });

  it('reads what a dish is built around from its ingredients, fish before meat', (): void => {
    const { kindOf } = usePlannerDishes();

    expect(kindOf(buildRecipe({ ingredients: { salmon: 150, rice: 100 } }))).toBe('fish');
    expect(kindOf(buildRecipe({ ingredients: { chickenBreast: 150 } }))).toBe('meat');
    expect(kindOf(buildRecipe({ ingredients: { lentils: 120, rice: 100 } }))).toBe('veggie');
    // Fish wins when a dish carries both, so a surf-and-turf never reads as meat.
    expect(kindOf(buildRecipe({ ingredients: { shrimp: 80, leanBeef: 120 } }))).toBe('fish');
  });

  it('calls a dish quick only up to twenty minutes', (): void => {
    const { isQuick } = usePlannerDishes();

    expect(isQuick(buildRecipe({ prepMinutes: 20 }))).toBe(true);
    expect(isQuick(buildRecipe({ prepMinutes: 21 }))).toBe(false);
  });

  it('offers a group only its own recipes, and pools post-workout into snacks', (): void => {
    const slotOf = (slot: RecipeSlot): Recipe => buildRecipe({ id: slot, slot });
    state.recipes = catalog([
      slotOf('main'),
      slotOf('breakfast'),
      slotOf('snack'),
      slotOf('postWorkout'),
    ]);
    const { dishesFor } = usePlannerDishes();

    expect(dishesFor('main').map((recipe): string => recipe.id)).toEqual(['main']);
    expect(
      dishesFor('snack')
        .map((recipe): string => recipe.id)
        .sort(),
    ).toEqual(['postWorkout', 'snack']);
  });

  it('keeps out of the eligible pool the kinds and prep times the reader ruled out', (): void => {
    state.recipes = catalog([
      buildRecipe({ id: 'fish', ingredients: { salmon: 150 }, prepMinutes: 15 }),
      buildRecipe({ id: 'slow', ingredients: { lentils: 120 }, prepMinutes: 45 }),
      buildRecipe({ id: 'quick', ingredients: { lentils: 120 }, prepMinutes: 15 }),
    ]);
    state.preferences = {
      value: { ...noPreferences(), excludedKinds: ['fish'], maxPrepMinutes: 20 },
    };
    const { eligibleDishesFor } = usePlannerDishes();

    expect(eligibleDishesFor('main').map((recipe): string => recipe.id)).toEqual(['quick']);
  });
});
