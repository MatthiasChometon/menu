import { beforeEach, describe, expect, it } from 'vitest';
import { recentDishIdsFrom, withEntryUpserted, type ComposedWeekEntry } from './usePlannerHistory';

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

describe('recent dish ids', () => {
  it('is empty when nothing was ever composed', () => {
    expect(recentDishIdsFrom([], '2026-09-01')).toEqual(new Set());
  });

  it('collects dishes from the two most recent other weeks', () => {
    const entries = [
      entry('2026-08-18', '2026-08-18T00:00:00.000Z', { main: ['old'] }),
      entry('2026-08-25', '2026-08-25T00:00:00.000Z', { main: ['a'], breakfast: ['b'] }),
      entry('2026-09-01', '2026-09-01T00:00:00.000Z', { main: ['c'] }),
    ];

    const recent = recentDishIdsFrom(entries, '2026-09-08');

    expect(recent).toEqual(new Set(['a', 'b', 'c']));
  });

  it('never counts the week being composed against itself', () => {
    const entries = [entry('2026-09-01', '2026-09-01T00:00:00.000Z', { main: ['a'] })];

    expect(recentDishIdsFrom(entries, '2026-09-01')).toEqual(new Set());
  });
});

describe('usePlannerHistory', () => {
  beforeEach((): void => {
    const { entries } = usePlannerHistory();
    entries.value = [];
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
});
