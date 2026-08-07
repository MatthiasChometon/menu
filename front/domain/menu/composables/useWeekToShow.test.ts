import { describe, expect, it } from 'vitest';

// Three consecutive weeks, so "the newest" and "the one being lived" can differ.
const WEEKS = ['2026-08-03', '2026-08-10', '2026-08-17'];

describe('weekToShow', () => {
  it('opens on the week being lived, not on the newest one planned', () => {
    const { weekToShow } = useWeekStatus();

    expect(weekToShow(WEEKS, new Date('2026-08-05T12:00:00'))).toBe('2026-08-03');
  });

  it('does not care what order the weeks arrive in', () => {
    const { weekToShow } = useWeekStatus();

    expect(weekToShow([...WEEKS].reverse(), new Date('2026-08-05T12:00:00'))).toBe('2026-08-03');
  });

  it('moves on as soon as the next week starts', () => {
    const { weekToShow } = useWeekStatus();

    expect(weekToShow(WEEKS, new Date('2026-08-10T00:00:00'))).toBe('2026-08-10');
  });

  it('stays on the week just gone when nothing covers today', () => {
    const { weekToShow } = useWeekStatus();

    // Past the last planned week: its leftovers are still what is in the fridge.
    expect(weekToShow(WEEKS, new Date('2026-08-26T12:00:00'))).toBe('2026-08-17');
  });

  it('falls forward to the nearest week when they are all still to come', () => {
    const { weekToShow } = useWeekStatus();

    expect(weekToShow(WEEKS, new Date('2026-07-20T12:00:00'))).toBe('2026-08-03');
  });

  it('has nothing to show without a single menu', () => {
    const { weekToShow } = useWeekStatus();

    expect(weekToShow([], new Date('2026-08-05T12:00:00'))).toBeUndefined();
  });

  it('agrees with the status it reports for that week', () => {
    const { weekToShow, statusOf } = useWeekStatus();
    const now = new Date('2026-08-12T09:00:00');

    const week = weekToShow(WEEKS, now);

    expect(week).toBeDefined();
    expect(statusOf(week ?? '', now)).toBe('current');
  });
});
