import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import type { PlannedWeek } from '../../planner/types/planner.type';

// The two things this engine reads from the account are stubbed; everything else
// (recipes, foods, the solver) is the real content, so the test proves the
// grammes are actually worked out, not that a mock returned them.
const { state } = vi.hoisted(() => ({
  state: {
    plan: undefined as PlannedWeek | undefined,
    targets: undefined as Record<string, number> | undefined,
  },
}));

type Store = {
  load: (weekOf: string) => Promise<PlannedWeek | undefined>;
  save: () => unknown;
  toInput: () => unknown;
  fromApi: () => unknown;
};
mockNuxtImport('useWeekPlanStore', () => (): Store => ({
  load: async (): Promise<PlannedWeek | undefined> => state.plan,
  save: vi.fn(),
  toInput: vi.fn(),
  fromApi: vi.fn(),
}));

type Prof = {
  profile: ComputedRef<{ targets: Record<string, number> } | undefined>;
  isLoading: ComputedRef<boolean>;
  hasAnswered: ComputedRef<boolean>;
  refresh: () => unknown;
  save: () => unknown;
};
mockNuxtImport('useProfile', () => (): Prof => ({
  profile: computed((): { targets: Record<string, number> } | undefined =>
    state.targets === undefined ? undefined : { targets: state.targets },
  ),
  isLoading: computed((): boolean => false),
  hasAnswered: computed((): boolean => false),
  refresh: vi.fn(),
  save: vi.fn(),
}));

const TARGETS = { kcal: 3000, protein: 165, fat: 80, carbs: 445, fiber: 30 };

describe('useComposedMenu', () => {
  it('shows nothing to weigh for when there is no profile to scale to', async () => {
    state.targets = undefined;
    state.plan = { weekOf: '2026-01-05', days: { monday: { lunch: 'chiliChicken' } } };

    expect(await useComposedMenu().menuFor('2026-01-05')).toBeUndefined();
  });

  it('shows nothing when the account has composed no such week', async () => {
    state.targets = TARGETS;
    state.plan = undefined;

    expect(await useComposedMenu().menuFor('2026-01-05')).toBeUndefined();
  });

  it('renders the composed week, weighing each dish to the reader targets', async () => {
    state.targets = TARGETS;
    state.plan = {
      weekOf: '2026-01-05',
      days: { monday: { breakfast: 'fullShaker', lunch: 'chiliChicken' } },
    };

    const menu = await useComposedMenu().menuFor('2026-01-05');

    expect(menu?.weekOf).toBe('2026-01-05');
    expect(menu?.days).toHaveLength(1);
    const monday = menu?.days[0];
    expect(monday?.key).toBe('monday');
    // Both composed meals are there, in the order they are eaten.
    expect(monday?.meals.map((meal): string => meal.slot)).toEqual(['breakfast', 'lunch']);
    // The grammes were computed, not stored: every meal weighs something.
    expect(monday?.meals.every((meal): boolean => meal.quantities.length > 0)).toBe(true);
    expect(
      monday?.meals.flatMap((meal) => meal.quantities).every((q): boolean => q.grams > 0),
    ).toBe(true);
    // The week carries its shopping list and a price, like a published menu did.
    expect(menu?.shoppingList.length).toBeGreaterThan(0);
    expect(menu?.totalPrice).toBeGreaterThan(0);
  });
});
