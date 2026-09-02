import { describe, expect, it } from 'vitest';
import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { WeightEntry } from '../../weight/types/weight.type';

const weigh = (date: string, kg: number): WeightEntry => ({ id: date, date, kg });

const week = (weekOf: string, rate: number): WeekAdherence => ({
  weekOf,
  rate,
  eatenCount: Math.round(rate * 10),
  totalCount: 10,
});

describe('useProgressionTable', () => {
  it('pairs each week of adherence history with its own weight change', () => {
    const { weeksOf } = useProgressionTable();

    const weeks = weeksOf(
      [week('2026-08-03', 0.9)],
      [weigh('2026-08-03', 80), weigh('2026-08-09', 80.4)],
    );

    expect(weeks).toEqual([{ weekOf: '2026-08-03', adherenceRate: 0.9, weightDeltaKg: 0.4 }]);
  });

  it('leaves the weight change undefined with fewer than two weigh-ins that week', () => {
    const { weeksOf } = useProgressionTable();

    const weeks = weeksOf([week('2026-08-03', 0.9)], [weigh('2026-08-03', 80)]);

    expect(weeks[0]?.weightDeltaKg).toBeUndefined();
  });

  it('ignores a weigh-in that falls outside the week', () => {
    const { weeksOf } = useProgressionTable();

    const weeks = weeksOf(
      [week('2026-08-03', 0.9)],
      [weigh('2026-08-03', 80), weigh('2026-08-20', 82)],
    );

    expect(weeks[0]?.weightDeltaKg).toBeUndefined();
  });

  it('reports insufficient data without a week on each side of the threshold', () => {
    const { hintOf } = useProgressionTable();

    const hint = hintOf([
      { weekOf: '2026-08-03', adherenceRate: 0.95, weightDeltaKg: 0.4 },
      { weekOf: '2026-08-10', adherenceRate: 1, weightDeltaKg: 0.3 },
    ]);

    expect(hint).toBe('insufficientData');
  });

  it('links steadier weight gain to the weeks eaten closely to plan', () => {
    const { hintOf } = useProgressionTable();

    const hint = hintOf([
      { weekOf: '2026-08-03', adherenceRate: 0.95, weightDeltaKg: 0.4 },
      { weekOf: '2026-08-10', adherenceRate: 0.5, weightDeltaKg: -0.1 },
    ]);

    expect(hint).toBe('moreRegularWithAdherence');
  });

  it('says nothing clear when the low-adherence weeks gained just as much', () => {
    const { hintOf } = useProgressionTable();

    const hint = hintOf([
      { weekOf: '2026-08-03', adherenceRate: 0.95, weightDeltaKg: 0.2 },
      { weekOf: '2026-08-10', adherenceRate: 0.5, weightDeltaKg: 0.4 },
    ]);

    expect(hint).toBe('noClearLink');
  });
});
