import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannedWeek } from '../types/planner.type';

const { load, persist, user } = vi.hoisted(() => ({
  load: vi.fn<(weekOf: string) => Promise<PlannedWeek | undefined>>(),
  persist: vi.fn<(plan: PlannedWeek) => Promise<string | undefined>>(),
  user: { value: { id: 'reader' } as { id: string } | undefined },
}));

mockNuxtImport('useWeekPlanStore', () => (): object => ({ load, save: persist }));
mockNuxtImport('useAuth', () => (): object => ({ user: ref(user.value) }));
mockNuxtImport('useProfile', () => (): object => ({
  profile: ref({ targets: { kcal: 3000, protein: 165, fat: 80, carbs: 445, fiber: 30 } }),
}));

const WEEK = '2026-09-07';

const PLANNER_STATE = [
  'planner:week',
  'planner:now',
  'planner:length',
  'planner:plan',
  'planner:dishes',
  'planner:step',
  'planner:saving',
  'planner:improving',
  'planner:generating',
  'planner:locked',
  'planner:savedAt',
  'planner:dirty',
  'planner:saveFailed',
  'planner:spreadFrom',
  'planner:loaded',
  'planner:drafts',
];

beforeEach((): void => {
  load.mockReset();
  persist.mockReset();
  user.value = { id: 'reader' };
  clearNuxtState(PLANNER_STATE);
  useState<string>('planner:week').value = WEEK;
});

// The first dishes of a group, as the picker would hand them over.
const firstDishes = (group: 'main' | 'breakfast' | 'snack', count: number): string[] =>
  usePlanner()
    .dishesFor(group)
    .slice(0, count)
    .map((recipe): string => recipe.id);

const selectEveryGroup = (): void => {
  const { toggleDish } = usePlanner();
  for (const id of firstDishes('main', 2)) toggleDish('main', id);
  for (const id of firstDishes('breakfast', 1)) toggleDish('breakfast', id);
  for (const id of firstDishes('snack', 2)) toggleDish('snack', id);
};

describe('choosing the dishes of a week', () => {
  it('refuses a dish beyond the ceiling of its group', () => {
    const { toggleDish, chosenDishes, limitsOf, dishesFor } = usePlanner();
    const { max } = limitsOf('main');

    for (const recipe of dishesFor('main').slice(0, max + 1)) toggleDish('main', recipe.id);

    expect(chosenDishes.value.main).toHaveLength(max);
  });

  it('takes a dish back out when it is chosen again', () => {
    const { toggleDish, chosenDishes } = usePlanner();
    const [id] = firstDishes('main', 1);
    if (id === undefined) throw new Error('no main dish in the catalog');

    toggleDish('main', id);
    toggleDish('main', id);

    expect(chosenDishes.value.main).toEqual([]);
  });

  it('opens the last step only once every step behind it is filled', () => {
    const { canReachStep, steps } = usePlanner();

    expect(canReachStep(steps.length)).toBe(false);

    selectEveryGroup();

    expect(canReachStep(steps.length)).toBe(true);
  });
});

describe('spreading the selection over the days', () => {
  it('fills every meal of every day, never the same dish at lunch and dinner', () => {
    selectEveryGroup();
    const { spread, plan, days } = usePlanner();

    spread();

    expect(days.value.every((day): boolean => day.meals.length > 0)).toBe(true);
    for (const slots of Object.values(plan.value.days)) {
      expect(slots.lunch).not.toBe(slots.dinner);
    }
  });

  it('leaves a pinned slot with the dish it holds', () => {
    selectEveryGroup();
    const { spread, plan, days, choose, toggleLock, isLocked } = usePlanner();
    spread();
    const first = days.value[0]?.key;
    if (first === undefined) throw new Error('no day');
    const other = firstDishes('main', 4).at(-1);
    if (other === undefined) throw new Error('no other dish');

    choose(first, 'lunch', other);
    toggleLock(first, 'lunch');
    spread();

    expect(isLocked(first, 'lunch')).toBe(true);
    expect(plan.value.days[first]?.lunch).toBe(other);
  });

  it('keeps a pinned slot through a clear of its day', () => {
    selectEveryGroup();
    const { spread, plan, days, toggleLock, clearDay } = usePlanner();
    spread();
    const first = days.value[0]?.key;
    if (first === undefined) throw new Error('no day');

    toggleLock(first, 'dinner');
    clearDay(first);

    expect(Object.keys(plan.value.days[first] ?? {})).toEqual(['dinner']);
  });
});

describe('saving the week', () => {
  it('records when it was saved and that nothing is left to save', async () => {
    persist.mockResolvedValue('2026-09-07T10:00:00Z');
    selectEveryGroup();
    const { spread, save, savedAt, isDirty, canSave } = usePlanner();
    spread();
    expect(canSave.value).toBe(true);

    await save();

    expect(persist).toHaveBeenCalledOnce();
    expect(persist.mock.calls[0]?.[0].weekOf).toBe(WEEK);
    expect(savedAt.value).toBe('2026-09-07T10:00:00Z');
    expect(isDirty.value).toBe(false);
  });

  it('says so when it failed, and keeps the week to save again', async () => {
    persist.mockRejectedValue(new Error('offline'));
    selectEveryGroup();
    const { spread, save, saveFailed, isDirty, isSaving } = usePlanner();
    spread();

    await save();

    expect(saveFailed.value).toBe(true);
    expect(isDirty.value).toBe(true);
    expect(isSaving.value).toBe(false);
  });

  it('does not save for somebody who is signed out', async () => {
    user.value = undefined;
    selectEveryGroup();
    const { spread, save } = usePlanner();
    spread();

    await save();

    expect(persist).not.toHaveBeenCalled();
  });
});

describe('reading a week back from the account', () => {
  const stored = (): PlannedWeek => ({
    weekOf: WEEK,
    days: {
      monday: { lunch: 'a', dinner: 'b' },
      tuesday: { lunch: 'b', dinner: 'a' },
      wednesday: { lunch: 'a', dinner: 'b' },
    },
  });

  it('opens the stored week at the length it was composed at', async () => {
    load.mockResolvedValue(stored());
    const { loadFromAccount, plan, length, isDirty } = usePlanner();

    await loadFromAccount();

    expect(plan.value.days.monday?.lunch).toBe('a');
    expect(length.value).toBe(3);
    expect(isDirty.value).toBe(false);
  });

  it('starts blank when nothing is stored for that week', async () => {
    load.mockResolvedValue(undefined);
    const { loadFromAccount, plan } = usePlanner();

    await loadFromAccount();

    expect(plan.value).toEqual({ weekOf: WEEK, days: {} });
  });
});

describe('moving between weeks', () => {
  it('parks the work in progress and brings it back', () => {
    load.mockResolvedValue(undefined);
    selectEveryGroup();
    const { spread, switchWeek, plan, chosenDishes } = usePlanner();
    spread();
    const composed = { ...plan.value.days };

    switchWeek('2026-09-14', WEEK);
    expect(plan.value.days).toEqual({});
    expect(chosenDishes.value).toEqual({});

    switchWeek(WEEK, '2026-09-14');
    expect(plan.value.days).toEqual(composed);
  });
});
