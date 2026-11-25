import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach((): void => {
  vi.useRealTimers();
});

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

  it('reads the current month on the Paris calendar, whatever the zone of the device', () => {
    // 22:00 on 31 August in Paris: already 1 September in Auckland, the zone the
    // suite runs in, so a month read on the device clock would say September.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-31T20:00:00Z'));

    expect(useSeason().currentMonth()).toBe(8);
  });
});
