import { describe, expect, it } from 'vitest';

describe('useWeightDates', () => {
  it('counts the days between two dates', () => {
    const { daysBetween } = useWeightDates();

    expect(daysBetween('2026-08-01', '2026-08-08')).toBe(7);
  });

  it('counts backwards as a negative span', () => {
    const { daysBetween } = useWeightDates();

    expect(daysBetween('2026-08-08', '2026-08-01')).toBe(-7);
  });

  it('carries the day count across a month boundary', () => {
    const { daysBetween } = useWeightDates();

    expect(daysBetween('2026-08-28', '2026-09-02')).toBe(5);
  });

  it('converts a week apart into exactly one week', () => {
    const { weeksBetween } = useWeightDates();

    expect(weeksBetween('2026-08-01', '2026-08-08')).toBe(1);
  });

  it('shifts a date forward and back', () => {
    const { shiftDate } = useWeightDates();

    expect(shiftDate('2026-08-01', 7)).toBe('2026-08-08');
    expect(shiftDate('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('accepts a real calendar date and rejects nonsense', () => {
    const { isValidDate } = useWeightDates();

    expect(isValidDate('2026-08-01')).toBe(true);
    expect(isValidDate('2026-13-40')).toBe(false);
    expect(isValidDate('not a date')).toBe(false);
  });

  it("reads today's date in the YYYY-MM-DD shape the log stores", () => {
    const { todayDate } = useWeightDates();

    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
