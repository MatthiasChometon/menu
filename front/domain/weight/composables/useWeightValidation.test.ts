import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('useWeightValidation', () => {
  it('accepts the weigh-in of the day a tab left open has since rolled into', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T10:00:00Z'));
    const { errorOf } = useWeightValidation();

    // The next morning, in the same tab: 21 August is today now.
    vi.setSystemTime(new Date('2026-08-21T10:00:00Z'));

    expect(errorOf({ date: '2026-08-21', kg: 80 })).toBeUndefined();
    expect(errorOf({ date: '2026-08-22', kg: 80 })).toBeDefined();
  });

  it('rejects a date that has not happened yet', () => {
    const { errorOf, todayDate } = useWeightValidation();
    const { shiftDate } = useWeightDates();

    expect(errorOf({ date: shiftDate(todayDate, 1), kg: 80 })).toBeDefined();
  });

  it('accepts a weight logged for today', () => {
    const { errorOf, todayDate } = useWeightValidation();

    expect(errorOf({ date: todayDate, kg: 80 })).toBeUndefined();
  });

  it('rejects a weight outside realistic bounds', () => {
    const { errorOf, bounds } = useWeightValidation();

    expect(errorOf({ date: '2026-08-01', kg: bounds.minKg - 1 })).toBeDefined();
    expect(errorOf({ date: '2026-08-01', kg: bounds.maxKg + 1 })).toBeDefined();
  });

  it('accepts a weight within realistic bounds', () => {
    const { errorOf, bounds } = useWeightValidation();

    expect(errorOf({ date: '2026-08-01', kg: bounds.minKg })).toBeUndefined();
    expect(errorOf({ date: '2026-08-01', kg: bounds.maxKg })).toBeUndefined();
  });

  it('rejects a date that is not a real calendar date', () => {
    const { errorOf } = useWeightValidation();

    expect(errorOf({ date: 'not a date', kg: 80 })).toBeDefined();
  });
});
