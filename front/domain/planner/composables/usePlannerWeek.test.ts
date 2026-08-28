import { describe, expect, it } from 'vitest';
import { daysFrom, startOf, weeksFrom, weekToCompose } from './usePlannerWeek';

// A Thursday: a window starts on the day itself now, so this is day zero.
const THURSDAY = new Date('2026-08-20T14:00:00');

describe('the windows open to composing', () => {
  it('starts on the day itself, at midnight — never rewound to Monday', () => {
    expect(startOf(THURSDAY)).toBe('2026-08-20');
    expect(startOf(new Date('2026-08-20T00:00:00'))).toBe('2026-08-20');
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
