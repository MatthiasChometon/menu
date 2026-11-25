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
  usePlannerHistory().entries.value = [];
  usePlannerPreferences().preferences.value = {
    excludedKinds: [],
    maxPrepMinutes: undefined,
    maxRepeatsPerWeek: undefined,
    weeklyBudget: undefined,
  };
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

const firstDayKey = (): DayKey => {
  const first = usePlanner().days.value[0]?.key;
  if (first === undefined) throw new Error('no day');

  return first;
};

describe('swapping a dish', () => {
  it('puts the dish in its slot and marks the week as changed', () => {
    selectEveryGroup();
    const { spread, applySwap, plan, isDirty, recipesFor } = usePlanner();
    spread();
    isDirty.value = false;
    const day = firstDayKey();
    const to = recipesFor('lunch').at(-1);
    if (to === undefined) throw new Error('no dish');

    applySwap({ day, slot: 'lunch', from: undefined, to, becomesValid: false });

    expect(plan.value.days[day]?.lunch).toBe(to.id);
    expect(isDirty.value).toBe(true);
  });

  it('leaves a pinned slot alone', () => {
    selectEveryGroup();
    const { spread, applySwap, plan, toggleLock, recipesFor } = usePlanner();
    spread();
    const day = firstDayKey();
    const before = plan.value.days[day]?.lunch;
    const to = recipesFor('lunch').at(-1);
    if (to === undefined) throw new Error('no dish');
    toggleLock(day, 'lunch');

    applySwap({ day, slot: 'lunch', from: undefined, to, becomesValid: false });

    expect(plan.value.days[day]?.lunch).toBe(before);
  });

  it('suggests nothing for a day that is already on target', () => {
    const { suggestFor } = usePlanner();
    const onTarget = { key: 'monday', isValid: true } as PlannedDay;

    expect(suggestFor(onTarget)).toBeUndefined();
  });

  it('offers at most three swaps, each replacing the dish it starts from', () => {
    selectEveryGroup();
    const { spread, days, swapsForMacro } = usePlanner();
    spread();
    const day = days.value[0];
    if (day === undefined) throw new Error('no day');

    const swaps = swapsForMacro(day, 'fiber');

    expect(swaps.length).toBeLessThanOrEqual(3);
    for (const { swap } of swaps) expect(swap.to.id).not.toBe(swap.from?.id);
  });

  it('never moves a pinned slot when improving the week, and settles the flag', async () => {
    selectEveryGroup();
    const { spread, improveWeek, isImproving, plan, toggleLock } = usePlanner();
    spread();
    const day = firstDayKey();
    const pinned = plan.value.days[day]?.dinner;
    toggleLock(day, 'dinner');

    await improveWeek();

    expect(plan.value.days[day]?.dinner).toBe(pinned);
    expect(isImproving.value).toBe(false);
  });

  it('does not start a second improve pass while one is running', async () => {
    selectEveryGroup();
    const { spread, improveWeek, isImproving } = usePlanner();
    spread();

    isImproving.value = true;
    await improveWeek();

    expect(isImproving.value).toBe(true);
  });
});

describe('generating a whole week', () => {
  it('fills every group to its floor, spreads it and records the week', async () => {
    const { generateWeek, isGenerating, groupOrder, limitsOf, chosenDishes, plan, needsSpread } =
      usePlanner();

    await generateWeek();

    for (const group of groupOrder) {
      expect(chosenDishes.value[group]?.length).toBeGreaterThanOrEqual(limitsOf(group).min);
    }
    expect(Object.keys(plan.value.days).length).toBeGreaterThan(0);
    expect(needsSpread.value).toBe(false);
    expect(isGenerating.value).toBe(false);
    expect(usePlannerHistory().entries.value.map((entry): string => entry.weekOf)).toEqual([WEEK]);
  });

  it('keeps away from a kind the reader excluded', async () => {
    usePlannerPreferences().toggleExcluded('fish');
    const { generateWeek, chosenDishes, kindOf, dishesFor } = usePlanner();

    await generateWeek();

    const fish = dishesFor('main')
      .filter((recipe): boolean => kindOf(recipe) === 'fish')
      .map((recipe): string => recipe.id);
    expect((chosenDishes.value.main ?? []).some((id): boolean => fish.includes(id))).toBe(false);
  });

  it('asks for more distinct dishes when repeats are capped', async () => {
    usePlannerPreferences().setMaxRepeatsPerWeek(2);
    const { generateWeek, chosenDishes, limitsOf } = usePlanner();

    await generateWeek();

    expect(chosenDishes.value.main?.length).toBeGreaterThan(limitsOf('main').min);
  });

  it('keeps a pinned slot through the whole generation', async () => {
    selectEveryGroup();
    const { spread, generateWeek, toggleLock, plan } = usePlanner();
    spread();
    const day = firstDayKey();
    const pinned = plan.value.days[day]?.lunch;
    toggleLock(day, 'lunch');

    await generateWeek();

    expect(plan.value.days[day]?.lunch).toBe(pinned);
  });

  it('does nothing while a generation is already running', async () => {
    const { generateWeek, isGenerating, chosenDishes } = usePlanner();

    isGenerating.value = true;
    await generateWeek();

    expect(chosenDishes.value).toEqual({});
  });
});

describe('looking back at the weeks composed before', () => {
  const remember = (weekOf: string, main: string[]): void =>
    usePlannerHistory().record(weekOf, { main });

  it('lists the other weeks, never the one on screen', () => {
    remember('2026-08-31', ['a', 'b']);
    remember(WEEK, ['c', 'd']);
    const { pastComposedWeeks } = usePlanner();

    expect(pastComposedWeeks.value.map((entry): string => entry.weekOf)).toEqual(['2026-08-31']);
  });

  it('starts this window from a past week and spreads it straight away', () => {
    const [first, second] = firstDishes('main', 2);
    if (first === undefined || second === undefined) throw new Error('no dishes');
    remember('2026-08-31', [first, second]);
    const { duplicateFrom, chosenDishes, plan, isDirty } = usePlanner();

    duplicateFrom('2026-08-31');

    expect(chosenDishes.value.main).toEqual([first, second]);
    expect(Object.values(plan.value.days).length).toBeGreaterThan(0);
    expect(isDirty.value).toBe(true);
  });

  it('ignores a week that was never composed', () => {
    const { duplicateFrom, chosenDishes } = usePlanner();

    duplicateFrom('2026-01-05');

    expect(chosenDishes.value).toEqual({});
  });

  it('steers the recommendations away from the dishes of last week', () => {
    const { recommendedIn } = usePlanner();
    const usual = [...recommendedIn('main')];
    remember('2026-08-31', usual);

    const now = recommendedIn('main');

    expect(usual.every((id): boolean => now.has(id))).toBe(false);
  });
});

describe('knowing when the selection needs spreading again', () => {
  it('asks again after a dish is added, and not once spread', () => {
    selectEveryGroup();
    const { spread, needsSpread, toggleDish, chosenDishes } = usePlanner();
    spread();
    expect(needsSpread.value).toBe(false);

    const extra = firstDishes('main', 3).at(-1);
    if (extra === undefined) throw new Error('no dish');
    toggleDish('main', extra);
    expect(chosenDishes.value.main).toContain(extra);
    expect(needsSpread.value).toBe(true);

    spread();
    expect(needsSpread.value).toBe(false);
  });

  it('asks again when the window is shortened', () => {
    selectEveryGroup();
    const { spread, needsSpread, length, plan } = usePlanner();
    spread();

    length.value = 3;
    expect(needsSpread.value).toBe(true);

    spread();
    expect(Object.keys(plan.value.days)).toHaveLength(3);
  });

  it('never asks while nothing is chosen', () => {
    const { canSpread, needsSpread } = usePlanner();

    expect(canSpread.value).toBe(false);
    expect(needsSpread.value).toBe(false);
  });
});

describe('the pinned slots and the drafts of other weeks', () => {
  it('brings the pins and the unsaved mark back with the draft of a week', () => {
    load.mockResolvedValue(undefined);
    selectEveryGroup();
    const { spread, switchWeek, toggleLock, isLocked, isDirty, needsSpread } = usePlanner();
    spread();
    const day = firstDayKey();
    toggleLock(day, 'lunch');

    switchWeek('2026-09-14', WEEK);
    expect(isLocked(day, 'lunch')).toBe(false);
    expect(isDirty.value).toBe(false);

    switchWeek(WEEK, '2026-09-14');
    expect(isLocked(day, 'lunch')).toBe(true);
    expect(isDirty.value).toBe(true);
    expect(needsSpread.value).toBe(false);
  });

  it('forgets the pins of a week read back from the account', async () => {
    selectEveryGroup();
    const { spread, toggleLock, isLocked, loadFromAccount } = usePlanner();
    spread();
    const day = firstDayKey();
    toggleLock(day, 'lunch');
    load.mockResolvedValue({ weekOf: WEEK, days: { monday: { lunch: 'a' } } });

    await loadFromAccount();

    expect(isLocked(day, 'lunch')).toBe(false);
  });

  it('does not pin an empty slot', () => {
    const { toggleLock, isLocked } = usePlanner();

    toggleLock('monday', 'lunch');

    expect(isLocked('monday', 'lunch')).toBe(false);
  });
});

describe('a week with missing days or slots', () => {
  it('rebuilds the shortlist from a stored week that only names some slots', async () => {
    load.mockResolvedValue({
      weekOf: WEEK,
      days: { monday: { lunch: 'a' }, tuesday: {}, wednesday: { dinner: 'b' } },
    });
    const { loadFromAccount, chosenDishes } = usePlanner();

    await loadFromAccount();

    expect(chosenDishes.value.main).toEqual(['a', 'b']);
    expect(chosenDishes.value.breakfast).toEqual([]);
  });

  it('copies a day that was never filled as an empty one', () => {
    const { copyDay, plan, chosen } = usePlanner();

    copyDay('monday', 'tuesday');

    expect(plan.value.days.tuesday).toEqual({});
    expect(chosen('tuesday', 'lunch')).toBeUndefined();
  });

  it('clears a day that was never filled without failing', () => {
    const { clearDay, plan } = usePlanner();

    clearDay('monday');

    expect(plan.value.days.monday).toEqual({});
  });
});
