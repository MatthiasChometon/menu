import { describe, expect, it } from 'vitest';
import { featuredSlotOf } from './useToday';

const buildMeal = (slot: MealSlot): Meal => ({
  slot,
  recipe: {
    id: slot,
    slot: 'main',
    name: { fr: slot, en: slot },
    prepMinutes: 10,
    batch: false,
    ingredients: {},
    seasonings: [],
    steps: { fr: [], en: [] },
  },
  quantities: [],
  macros: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  portionRatio: 1,
});

// breakfast 7:00, postWorkout 10:30, lunch 12:30, snack 16:30, dinner 20:30.
const DAY: Meal[] = (['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner'] as const).map(
  buildMeal,
);

describe('featuredSlotOf', () => {
  it('has nothing to feature on a day with no meals', () => {
    expect(featuredSlotOf([], new Date('2026-08-10T08:00:00'))).toBeUndefined();
  });

  it('puts the first meal in the spotlight as "up next" before it opens', () => {
    const slot = featuredSlotOf(DAY, new Date('2026-08-10T06:00:00'));

    expect(slot).toEqual({ index: 0, isCurrent: false });
  });

  it('features the slot whose window has just opened', () => {
    const slot = featuredSlotOf(DAY, new Date('2026-08-10T07:05:00'));

    expect(slot).toEqual({ index: 0, isCurrent: true });
  });

  it('keeps featuring a slot until the next one opens', () => {
    // Between breakfast and postWorkout: still breakfast's window.
    const slot = featuredSlotOf(DAY, new Date('2026-08-10T09:00:00'));

    expect(slot).toEqual({ index: 0, isCurrent: true });
  });

  it('moves on to lunch once its window opens', () => {
    const slot = featuredSlotOf(DAY, new Date('2026-08-10T12:30:00'));

    expect(slot).toEqual({ index: 2, isCurrent: true });
  });

  it('features dinner, the last slot, once the evening has started', () => {
    const slot = featuredSlotOf(DAY, new Date('2026-08-10T22:00:00'));

    expect(slot).toEqual({ index: 4, isCurrent: true });
  });

  it('skips a day missing its early slots straight to what exists', () => {
    const lunchOnwards = DAY.slice(2);

    const slot = featuredSlotOf(lunchOnwards, new Date('2026-08-10T08:00:00'));

    expect(slot).toEqual({ index: 0, isCurrent: false });
  });
});
