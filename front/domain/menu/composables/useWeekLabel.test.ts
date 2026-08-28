import { describe, expect, it } from 'vitest';
import { useWeekLabel } from './useWeekLabel';

// Windows are anchored to today now, so the offsets are measured from this day,
// not from the Monday of its week.
const TODAY = new Date('2026-08-20T14:00:00');

describe('naming a window the way somebody would say it', () => {
  const { keyOf, offsetOf } = useWeekLabel();

  it('calls the window starting today "current"', () => {
    expect(keyOf('2026-08-20', TODAY)).toBe('current');
    expect(keyOf('2026-08-20', new Date('2026-08-20T00:05:00'))).toBe('current');
  });

  it('names the window a week before and a week after', () => {
    expect(keyOf('2026-08-13', TODAY)).toBe('last');
    expect(keyOf('2026-08-27', TODAY)).toBe('next');
  });

  // A window nobody has a word for is better shown as its date than as
  // "in 3 weeks", which the reader would have to count out.
  it('leaves a further window unnamed, so its date is shown instead', () => {
    expect(keyOf('2026-09-10', TODAY)).toBeUndefined();
    expect(keyOf('2026-07-30', TODAY)).toBeUndefined();
  });

  it('counts whole weeks from today, not days', () => {
    expect(offsetOf('2026-08-20', TODAY)).toBe(0);
    expect(offsetOf('2026-09-03', TODAY)).toBe(2);
    expect(offsetOf('2026-08-06', TODAY)).toBe(-2);
  });
});
