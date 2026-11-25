import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { useToday } from './useToday';

const meal = (id: string): Meal =>
  ({
    slot: 'breakfast',
    recipe: { id },
    quantities: [],
    macros: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    portionRatio: 1,
  }) as unknown as Meal;

// Monday is the day the UTC calendar is on, Tuesday the one Paris is on.
const WEEK = {
  weekOf: '2026-08-11',
  days: [
    { key: 'monday', meals: [meal('mondayDish')] },
    { key: 'tuesday', meals: [meal('tuesdayDish')] },
  ],
};

const { menuFor } = vi.hoisted(() => ({ menuFor: vi.fn() }));

mockNuxtImport('useComposedMenu', () => (): { menuFor: typeof menuFor } => ({ menuFor }));
mockNuxtImport('useAuth', () => (): object => ({
  user: ref({ id: 'reader' }),
  isLoading: computed((): boolean => false),
}));
mockNuxtImport('useProfile', () => (): object => ({
  profile: ref({ targets: { kcal: 3000, protein: 165, fat: 80, carbs: 445, fiber: 30 } }),
}));

const Probe = defineComponent({
  setup: () => {
    const { featuredMeal } = useToday();

    return (): ReturnType<typeof h> =>
      h('p', { 'data-testid': 'today' }, featuredMeal.value?.day ?? 'none');
  },
});

afterEach((): void => {
  vi.useRealTimers();
  clearNuxtData('today:menu');
});

describe('which day is today', () => {
  // 22:30 UTC on the 10th is already 00:30 on the 11th in Paris. Under a UTC
  // device zone the local-time code picks the 10th (Monday).
  it('is the Paris day at half past midnight, not the UTC one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-10T22:30:00Z'));
    menuFor.mockResolvedValue(WEEK);

    await renderSuspended(Probe);

    await waitFor((): void => expect(screen.getByTestId('today').textContent).toBe('tuesday'));
  });
});
