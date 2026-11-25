import { describe, expect, it } from 'vitest';

// Instants are given in UTC so the expectation reads the same wherever the tests
// run; the comments say what the Paris clock showed.
describe('finding the week that has to be planned', () => {
  const { weekAfter } = useNextWeek();

  it('points at next Monday from the middle of the week', () => {
    expect(weekAfter(new Date('2026-08-20T12:00:00Z'))).toBe('2026-08-24');
  });

  it('points at next Monday from a Monday, not at today', () => {
    expect(weekAfter(new Date('2026-08-17T06:00:00Z'))).toBe('2026-08-24');
  });

  // Sunday closes the week, so its "next" is the very next day. Counting it as
  // the start of a week would leave the reader planning the week they are in.
  it('points at tomorrow from a Sunday', () => {
    expect(weekAfter(new Date('2026-08-23T12:00:00Z'))).toBe('2026-08-24');
  });

  // 21:30 UTC is 23:30 in Paris on Sunday; 22:30 UTC is already Monday 00:30
  // there. A device in another zone must not move the line.
  it('switches week at midnight in Paris, not at midnight on the device', () => {
    expect(weekAfter(new Date('2026-08-23T21:30:00Z'))).toBe('2026-08-24');
    expect(weekAfter(new Date('2026-08-23T22:30:00Z'))).toBe('2026-08-31');
  });

  it('crosses a month boundary', () => {
    expect(weekAfter(new Date('2026-08-27T09:00:00Z'))).toBe('2026-08-31');
    expect(weekAfter(new Date('2026-08-31T09:00:00Z'))).toBe('2026-09-07');
  });

  it('crosses a year boundary', () => {
    expect(weekAfter(new Date('2026-12-30T09:00:00Z'))).toBe('2027-01-04');
  });
});
