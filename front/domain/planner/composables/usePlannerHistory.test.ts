import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_VARIETY_WINDOW_WEEKS,
  repeatPenaltyOf,
  weeksAgoOf,
  withEntryUpserted,
  type ComposedWeekEntry,
} from './usePlannerHistory';

const entry = (
  weekOf: string,
  composedAt: string,
  chosen: Partial<Record<RecipeSlot, string[]>>,
): ComposedWeekEntry => ({ weekOf, composedAt, chosen });

describe('recording a composed week', () => {
  it('adds a week that was never recorded before', () => {
    const entries = withEntryUpserted([], entry('2026-09-01', '2026-09-01T10:00:00.000Z', { main: ['a'] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.weekOf).toBe('2026-09-01');
  });

  it('replaces the same week instead of duplicating it', () => {
    const first = entry('2026-09-01', '2026-09-01T10:00:00.000Z', { main: ['a'] });
    const second = entry('2026-09-01', '2026-09-01T11:00:00.000Z', { main: ['b'] });

    const entries = withEntryUpserted([first], second);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.chosen.main).toEqual(['b']);
  });

  it('keeps the most recent weeks first, bounded to the cap', () => {
    const many = Array.from({ length: 10 }, (_, index): ComposedWeekEntry =>
      entry(`week-${index}`, `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`, {}),
    );

    const entries = many.reduce(
      (acc, next): ComposedWeekEntry[] => withEntryUpserted(acc, next, 8),
      [] as ComposedWeekEntry[],
    );

    expect(entries).toHaveLength(8);
    expect(entries[0]?.weekOf).toBe('week-9');
  });
});

describe('how many weeks ago a dish last appeared', () => {
  it('is undefined when nothing was ever composed', () => {
    expect(weeksAgoOf([], '2026-09-08', 'chiliChicken', 3)).toBeUndefined();
  });

  it('is zero for a dish used in the most recent other week', () => {
    const entries = [
      entry('2026-08-25', '2026-08-25T00:00:00.000Z', { main: ['a'] }),
      entry('2026-09-01', '2026-09-01T00:00:00.000Z', { main: ['b'] }),
    ];

    expect(weeksAgoOf(entries, '2026-09-08', 'b', 3)).toBe(0);
    expect(weeksAgoOf(entries, '2026-09-08', 'a', 3)).toBe(1);
  });

  it('never counts the week being composed against itself', () => {
    const entries = [entry('2026-09-01', '2026-09-01T00:00:00.000Z', { main: ['a'] })];

    expect(weeksAgoOf(entries, '2026-09-01', 'a', 3)).toBeUndefined();
  });

  it('is undefined once a dish falls outside the window', () => {
    const entries = [
      entry('2026-08-11', '2026-08-11T00:00:00.000Z', { main: ['old'] }),
      entry('2026-08-18', '2026-08-18T00:00:00.000Z', { main: ['b'] }),
      entry('2026-08-25', '2026-08-25T00:00:00.000Z', { main: ['c'] }),
    ];

    expect(weeksAgoOf(entries, '2026-09-01', 'old', 2)).toBeUndefined();
  });
});

describe('the repeat penalty', () => {
  it('is zero for a dish that has not shown up recently', () => {
    expect(repeatPenaltyOf([], '2026-09-08', 'chiliChicken', 3)).toBe(0);
  });

  it('is heaviest for a dish used in the very last composed week', () => {
    const entries = [entry('2026-08-25', '2026-08-25T00:00:00.000Z', { main: ['chiliChicken'] })];

    expect(repeatPenaltyOf(entries, '2026-09-01', 'chiliChicken', 3)).toBe(20);
  });

  it('tapers off the further back the week sits, not a flat cutoff', () => {
    const entries = [
      entry('2026-08-11', '2026-08-11T00:00:00.000Z', { main: ['old'] }),
      entry('2026-08-18', '2026-08-18T00:00:00.000Z', { main: ['mid'] }),
      entry('2026-08-25', '2026-08-25T00:00:00.000Z', { main: ['recent'] }),
    ];

    const recentPenalty = repeatPenaltyOf(entries, '2026-09-01', 'recent', 3);
    const midPenalty = repeatPenaltyOf(entries, '2026-09-01', 'mid', 3);
    const oldPenalty = repeatPenaltyOf(entries, '2026-09-01', 'old', 3);

    expect(recentPenalty).toBeCloseTo(20);
    expect(midPenalty).toBeCloseTo(40 / 3);
    expect(oldPenalty).toBeCloseTo(20 / 3);
    // Never a hard ban: every one of them stays well below a difference that
    // would outweigh a dish actually helping the week hit its targets.
    expect(recentPenalty).toBeGreaterThan(midPenalty);
    expect(midPenalty).toBeGreaterThan(oldPenalty);
    expect(oldPenalty).toBeGreaterThan(0);
  });

  it('is zero once a narrower window leaves the dish behind', () => {
    const entries = [entry('2026-08-11', '2026-08-11T00:00:00.000Z', { main: ['old'] })];

    expect(repeatPenaltyOf(entries, '2026-09-01', 'old', 1)).toBe(0);
  });
});

describe('usePlannerHistory', () => {
  beforeEach((): void => {
    const { entries, setVarietyWindowWeeks } = usePlannerHistory();
    entries.value = [];
    setVarietyWindowWeeks(undefined);
  });

  it('records a week and finds it among the others', () => {
    const { record, entriesExcept } = usePlannerHistory();

    record('2026-09-01', { main: ['chiliChicken'] });

    expect(entriesExcept('2026-09-08')).toHaveLength(1);
    expect(entriesExcept('2026-09-08')[0]?.weekOf).toBe('2026-09-01');
  });

  it('excludes the week itself from its own history lookup', () => {
    const { record, entriesExcept } = usePlannerHistory();

    record('2026-09-01', { main: ['chiliChicken'] });

    expect(entriesExcept('2026-09-01')).toHaveLength(0);
  });

  it('defaults the variety window when the reader never set one', () => {
    const { varietyWindowWeeks, varietyWindowWeeksSetting } = usePlannerHistory();

    expect(varietyWindowWeeksSetting.value).toBeUndefined();
    expect(varietyWindowWeeks.value).toBe(DEFAULT_VARIETY_WINDOW_WEEKS);
  });

  it('remembers the reader own window across instances', () => {
    const { setVarietyWindowWeeks, varietyWindowWeeksSetting } = usePlannerHistory();

    setVarietyWindowWeeks(6);

    expect(varietyWindowWeeksSetting.value).toBe(6);
    expect(usePlannerHistory().varietyWindowWeeks.value).toBe(6);
  });

  it('scores the repeat penalty for a dish using the current window', () => {
    const { record, repeatPenalty, setVarietyWindowWeeks } = usePlannerHistory();
    setVarietyWindowWeeks(1);
    record('2026-08-25', { main: ['chiliChicken'] });

    expect(repeatPenalty('2026-09-01', 'chiliChicken')).toBe(20);
    expect(repeatPenalty('2026-09-01', 'somethingElse')).toBe(0);
  });
});
