import { describe, expect, it } from 'vitest';

const WEEK = '2026-08-03';

describe('useWeekStatus', () => {
  it('sees a week that has not started yet as upcoming', () => {
    const { statusOf } = useWeekStatus();

    expect(statusOf(WEEK, new Date('2026-07-31T09:00:00'))).toBe('upcoming');
  });

  it('counts the first hour of Monday as part of the week', () => {
    const { statusOf } = useWeekStatus();

    expect(statusOf(WEEK, new Date('2026-08-03T00:30:00'))).toBe('current');
  });

  it('counts the last hour of Sunday as part of the week', () => {
    const { statusOf } = useWeekStatus();

    expect(statusOf(WEEK, new Date('2026-08-09T23:30:00'))).toBe('current');
  });

  it('sees the following Monday as past', () => {
    const { statusOf } = useWeekStatus();

    expect(statusOf(WEEK, new Date('2026-08-10T00:00:00'))).toBe('past');
  });

  it('reads the weekday Monday-first', () => {
    const { dayIndexOf } = useWeekStatus();

    expect(dayIndexOf(new Date('2026-08-03T12:00:00'))).toBe(0);
    expect(dayIndexOf(new Date('2026-08-09T12:00:00'))).toBe(6);
  });

  it('only places a day inside its own week', () => {
    const { isWithin } = useWeekStatus();

    // A Friday, but the Friday before the menu starts: it must not be "today".
    expect(isWithin(WEEK, new Date('2026-07-31T09:00:00'))).toBe(false);
    expect(isWithin(WEEK, new Date('2026-08-07T09:00:00'))).toBe(true);
  });
});
