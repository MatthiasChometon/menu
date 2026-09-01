import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  useWeightLog().reset();
});

describe('useWeightLog', () => {
  it('starts with no weigh-in at all', () => {
    expect(useWeightLog().entries.value).toEqual([]);
  });

  it('remembers a weigh-in', () => {
    const { add, entries } = useWeightLog();

    add({ date: '2026-08-01', kg: 82.4 });

    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]).toMatchObject({ date: '2026-08-01', kg: 82.4 });
  });

  it('rounds a typed weight to one decimal', () => {
    const { add, entries } = useWeightLog();

    add({ date: '2026-08-01', kg: 82.456 });

    expect(entries.value[0]?.kg).toBe(82.5);
  });

  it('lists the most recent weigh-in first', () => {
    const { add, entries } = useWeightLog();

    add({ date: '2026-08-01', kg: 80 });
    add({ date: '2026-08-05', kg: 81 });

    expect(entries.value.map((entry) => entry.date)).toEqual(['2026-08-05', '2026-08-01']);
  });

  it('rejects a date that has not happened yet', () => {
    const { errorOf, todayDate } = useWeightLog();
    const { shiftDate } = useWeightDates();

    expect(errorOf({ date: shiftDate(todayDate, 1), kg: 80 })).toBeDefined();
  });

  it('accepts a weight logged for today', () => {
    const { errorOf, todayDate } = useWeightLog();

    expect(errorOf({ date: todayDate, kg: 80 })).toBeUndefined();
  });

  it('rejects a weight outside realistic bounds', () => {
    const { errorOf, bounds } = useWeightLog();

    expect(errorOf({ date: '2026-08-01', kg: bounds.minKg - 1 })).toBeDefined();
    expect(errorOf({ date: '2026-08-01', kg: bounds.maxKg + 1 })).toBeDefined();
  });

  it('rejects a date that is not a real calendar date', () => {
    const { errorOf } = useWeightLog();

    expect(errorOf({ date: 'not a date', kg: 80 })).toBeDefined();
  });

  it('updates an existing entry', () => {
    const { add, update, entries } = useWeightLog();

    add({ date: '2026-08-01', kg: 80 });
    const id = entries.value[0]!.id;
    update(id, { date: '2026-08-02', kg: 79.5 });

    expect(entries.value[0]).toMatchObject({ date: '2026-08-02', kg: 79.5 });
  });

  it('never applies an update that fails validation', () => {
    const { add, update, entries, bounds } = useWeightLog();

    add({ date: '2026-08-01', kg: 80 });
    const id = entries.value[0]!.id;
    update(id, { date: '2026-08-01', kg: bounds.maxKg + 50 });

    expect(entries.value[0]?.kg).toBe(80);
  });

  it('removes an entry', () => {
    const { add, remove, entries } = useWeightLog();

    add({ date: '2026-08-01', kg: 80 });
    remove(entries.value[0]!.id);

    expect(entries.value).toEqual([]);
  });
});
