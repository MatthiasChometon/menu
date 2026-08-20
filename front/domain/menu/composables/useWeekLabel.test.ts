import { describe, expect, it } from 'vitest';
import { useWeekLabel } from './useWeekLabel';

// Thursday 20 August 2026, in the week starting Monday 17 August.
const THURSDAY = new Date('2026-08-20T14:00:00');

describe('naming a week the way somebody would say it', () => {
  const { keyOf, offsetOf } = useWeekLabel();

  it('calls the week we are living "current", from any day of it', () => {
    expect(keyOf('2026-08-17', THURSDAY)).toBe('current');
    expect(keyOf('2026-08-17', new Date('2026-08-17T00:05:00'))).toBe('current');
    expect(keyOf('2026-08-17', new Date('2026-08-23T23:00:00'))).toBe('current');
  });

  it('names the one before and the one after', () => {
    expect(keyOf('2026-08-10', THURSDAY)).toBe('last');
    expect(keyOf('2026-08-24', THURSDAY)).toBe('next');
  });

  // A week nobody has a word for is better shown as its date than as
  // "in 3 weeks", which the reader would have to count out.
  it('leaves a further week unnamed, so its date is shown instead', () => {
    expect(keyOf('2026-09-07', THURSDAY)).toBeUndefined();
    expect(keyOf('2026-07-06', THURSDAY)).toBeUndefined();
  });

  it('counts whole weeks apart, not days', () => {
    expect(offsetOf('2026-08-17', THURSDAY)).toBe(0);
    expect(offsetOf('2026-08-31', THURSDAY)).toBe(2);
    expect(offsetOf('2026-08-03', THURSDAY)).toBe(-2);
  });

  it('does not let a Sunday drift into the following week', () => {
    // Sunday closes the week here, as ISO 8601 has it.
    expect(keyOf('2026-08-17', new Date('2026-08-23T20:00:00'))).toBe('current');
    expect(keyOf('2026-08-24', new Date('2026-08-23T20:00:00'))).toBe('next');
  });
});
