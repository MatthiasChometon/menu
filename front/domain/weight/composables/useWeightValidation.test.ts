import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('useWeightValidation', () => {
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
