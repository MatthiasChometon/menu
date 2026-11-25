import { describe, expect, it } from 'vitest';

describe('turning a week into what the API stores', () => {
  const { toInput, fromApi } = useWeekPlanStore();

  it('sends the slots a day has and drops the days that hold no meal', () => {
    const input = toInput({
      weekOf: '2026-09-07',
      days: { monday: { lunch: 'a' }, tuesday: {}, wednesday: { dinner: 'b', snack: 'c' } },
    });

    expect(input.days.map((day): string => day.day)).toEqual(['MONDAY', 'WEDNESDAY']);
    expect(input.days[1]?.meals).toEqual([
      { slot: 'DINNER', recipeId: 'b' },
      { slot: 'SNACK', recipeId: 'c' },
    ]);
  });

  it('sends nothing for a week with no day at all', () => {
    expect(toInput({ weekOf: '2026-09-07', days: {} }).days).toEqual([]);
  });

  it('reads a stored week back to the keys the site uses', () => {
    const plan = fromApi('2026-09-07', [
      { day: 'FRIDAY', meals: [{ slot: 'POST_WORKOUT', recipeId: 'a' }] },
    ]);

    expect(plan).toEqual({ weekOf: '2026-09-07', days: { friday: { postWorkout: 'a' } } });
  });

  // Coercing to Monday or lunch would quietly rearrange the week a reader planned.
  it('refuses a stored day it does not know instead of calling it Monday', () => {
    expect(() => fromApi('2026-09-07', [{ day: 'FUNDAY', meals: [] }])).toThrow('Unknown day');
  });

  it('refuses a stored meal slot it does not know instead of calling it lunch', () => {
    expect(() =>
      fromApi('2026-09-07', [{ day: 'FRIDAY', meals: [{ slot: 'BRUNCH', recipeId: 'a' }] }]),
    ).toThrow('Unknown meal slot');
  });
});
