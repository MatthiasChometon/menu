import { describe, expect, it } from 'vitest';
import {
  daysFrom,
  startOf,
  usePlannerWeek,
  weeksBetween,
  weeksFrom,
  weekToCompose,
} from './usePlannerWeek';

// A Thursday: a window starts on the day itself now, so this is day zero.
const THURSDAY = new Date('2026-08-20T12:00:00Z');

describe('the windows open to composing', () => {
  it('starts on the day itself, at midnight — never rewound to Monday', () => {
    expect(startOf(THURSDAY)).toBe('2026-08-20');
    expect(startOf(new Date('2026-08-19T22:00:00Z'))).toBe('2026-08-20');
    expect(startOf(THURSDAY, 1)).toBe('2026-08-27');
  });

  it('offers the window from today and the ones to come, never one gone by', () => {
    const weeks = weeksFrom(THURSDAY);

    expect(weeks[0]).toBe('2026-08-20');
    expect(weeks.at(-1)).toBe('2026-09-24');
    expect(weeks.every((week): boolean => week >= '2026-08-20')).toBe(true);
  });

  it('opens on the window starting today while it has nothing to eat', () => {
    expect(weekToCompose(THURSDAY, [])).toBe('2026-08-20');
    expect(weekToCompose(THURSDAY, ['2026-08-13'])).toBe('2026-08-20');
  });

  it('opens on the next window once today is planned', () => {
    expect(weekToCompose(THURSDAY, ['2026-08-20'])).toBe('2026-08-27');
  });
});

describe('the days a window covers', () => {
  it('runs from the day it starts, wrapping past the weekend', () => {
    // 2026-08-20 is a Thursday.
    expect(daysFrom('2026-08-20')).toEqual([
      'thursday',
      'friday',
      'saturday',
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
    ]);
  });

  it('spans only as many days as asked, from the start', () => {
    expect(daysFrom('2026-08-20', 3)).toEqual(['thursday', 'friday', 'saturday']);
  });

  it('never runs shorter than three days or longer than a week', () => {
    expect(daysFrom('2026-08-20', 1)).toHaveLength(3);
    expect(daysFrom('2026-08-20', 12)).toHaveLength(7);
  });
});

// Instants, not local dates: the Paris day must come out the same wherever the
// tests run, so none of these depends on the zone of the machine.
describe('the Paris calendar day', () => {
  it('is already the next day when Paris is past midnight but the instant is not', () => {
    // 23:30 UTC in summer is 01:30 the next day in Paris (UTC+2).
    expect(startOf(new Date('2026-08-20T23:30:00Z'))).toBe('2026-08-21');
  });

  it('is the same day for the whole of a Paris day, midnight included', () => {
    // 22:00 UTC in summer is exactly midnight in Paris.
    expect(startOf(new Date('2026-08-20T21:59:00Z'))).toBe('2026-08-20');
    expect(startOf(new Date('2026-08-20T22:00:00Z'))).toBe('2026-08-21');
  });

  it('keeps whole weeks apart across the daylight-saving change', () => {
    // Clocks went back on 2026-10-25.
    expect(startOf(new Date('2026-10-22T12:00:00Z'), 1)).toBe('2026-10-29');
    expect(weeksBetween('2026-10-22', '2026-10-29')).toBe(1);
    expect(weeksBetween('2026-10-01', '2026-11-12')).toBe(6);
  });

  it('names a plain date in the reader language, whatever the zone of the device', () => {
    // A plain date is read as a UTC midnight; formatted in a local zone behind
    // UTC it would come out as the 25th.
    expect(usePlannerWeek().dateOf('2026-10-26')).toBe('October 26');
  });
});
