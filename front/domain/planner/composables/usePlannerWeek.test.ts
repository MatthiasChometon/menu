import { describe, expect, it } from 'vitest';
import { mondayOf, weeksFrom, weekToCompose } from './usePlannerWeek';

// A Thursday, so the Monday has to be worked out rather than read off.
const THURSDAY = new Date('2026-08-20T14:00:00');

describe('the weeks open to composing', () => {
  it('starts from the Monday of the week being lived, whatever day it is', () => {
    expect(mondayOf(THURSDAY)).toBe('2026-08-17');
    expect(mondayOf(new Date('2026-08-17T00:00:00'))).toBe('2026-08-17');
    expect(mondayOf(new Date('2026-08-23T23:59:00'))).toBe('2026-08-17');
  });

  it('offers this week and the ones to come, never one gone by', () => {
    const weeks = weeksFrom(THURSDAY);

    expect(weeks[0]).toBe('2026-08-17');
    expect(weeks.at(-1)).toBe('2026-09-21');
    expect(weeks.every((week): boolean => week >= '2026-08-17')).toBe(true);
  });

  it('opens on the week being lived while it has nothing to eat', () => {
    expect(weekToCompose(THURSDAY, [])).toBe('2026-08-17');
    expect(weekToCompose(THURSDAY, ['2026-08-10'])).toBe('2026-08-17');
  });

  it('opens on the week to come once this one is planned', () => {
    expect(weekToCompose(THURSDAY, ['2026-08-17'])).toBe('2026-08-24');
  });
});
