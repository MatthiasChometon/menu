import { describe, expect, it } from 'vitest';

describe('finding the week that has to be planned', () => {
  const { weekAfter } = useNextWeek();

  it('points at next Monday from the middle of the week', () => {
    expect(weekAfter(new Date('2026-08-20T14:00:00'))).toBe('2026-08-24');
  });

  it('points at next Monday from a Monday, not at today', () => {
    expect(weekAfter(new Date('2026-08-17T08:00:00'))).toBe('2026-08-24');
  });

  // Sunday closes the week, so its "next" is the very next day. Counting it as
  // the start of a week would leave the reader planning the week they are in.
  it('points at tomorrow from a Sunday', () => {
    expect(weekAfter(new Date('2026-08-23T22:00:00'))).toBe('2026-08-24');
  });

  it('crosses a month boundary', () => {
    expect(weekAfter(new Date('2026-08-27T09:00:00'))).toBe('2026-08-31');
    expect(weekAfter(new Date('2026-08-31T09:00:00'))).toBe('2026-09-07');
  });

  it('crosses a year boundary', () => {
    expect(weekAfter(new Date('2026-12-30T09:00:00'))).toBe('2027-01-04');
  });
});
