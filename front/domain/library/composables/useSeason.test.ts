import { describe, expect, it } from 'vitest';

describe('useSeason', () => {
  it('says a summer vegetable is in season in July', () => {
    const { isInSeason } = useSeason();

    expect(isInSeason('tomato', 7)).toBe(true);
    expect(isInSeason('tomato', 1)).toBe(false);
  });

  it('lists every food in season for a given month', () => {
    const { seasonalFoodIds } = useSeason();

    const september = seasonalFoodIds(9);

    expect(september).toContain('tomato');
    expect(september).toContain('apple');
    expect(september).not.toContain('orange');
  });

  it('treats a food with no entry as never in season', () => {
    const { isInSeason } = useSeason();

    expect(isInSeason('banana', 6)).toBe(false);
  });

  it('reads the current month from the calendar', () => {
    const { currentMonth } = useSeason();

    expect(currentMonth()).toBe(new Date().getMonth() + 1);
  });
});
