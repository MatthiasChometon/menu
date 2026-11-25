import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach((): void => {
  vi.useRealTimers();
});

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

  it("reads today's date on the Paris calendar, whatever the zone of the device", () => {
    // 22:00 in Paris: the same instant is already tomorrow in Auckland, the zone
    // the suite runs in, and still today in New York.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T20:00:00Z'));

    expect(useWeightDates().todayDate()).toBe('2026-08-20');
  });

  it('rejects a day the calendar does not have', () => {
    const { isValidDate } = useWeightDates();

    expect(isValidDate('2026-02-31')).toBe(false);
    expect(isValidDate('2026-04-31')).toBe(false);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
  });

  it('counts a week as a week across a daylight-saving change', () => {
    const { weeksBetween, daysBetween, shiftDate } = useWeightDates();

    // Paris springs forward on 2026-03-29, Auckland on 2026-09-27: a week that
    // holds either is 167 hours long on a local clock, not 168.
    expect(weeksBetween('2026-03-25', '2026-04-01')).toBe(1);
    expect(weeksBetween('2026-09-24', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-09-24', '2026-10-01')).toBe(7);
    expect(shiftDate('2026-09-24', 7)).toBe('2026-10-01');
  });

  it('keeps a fraction of a week as a fraction', () => {
    expect(useWeightDates().weeksBetween('2026-08-01', '2026-08-04')).toBeCloseTo(3 / 7, 10);
  });
});
