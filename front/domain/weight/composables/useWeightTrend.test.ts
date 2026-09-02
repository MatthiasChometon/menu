import { describe, expect, it } from 'vitest';

const entry = (date: string, kg: number): WeightEntry => ({ id: date, date, kg });

describe('useWeightTrend', () => {
  it('orders entries oldest first, whatever order they were logged in', () => {
    const { chronological } = useWeightTrend();

    const ordered = chronological([entry('2026-08-08', 81), entry('2026-08-01', 80)]);

    expect(ordered.map((item) => item.date)).toEqual(['2026-08-01', '2026-08-08']);
  });

  it('starts the moving average at the first weigh-in itself', () => {
    const { movingAverageOf } = useWeightTrend();

    const trend = movingAverageOf([entry('2026-08-01', 80)]);

    expect(trend[0]?.kg).toBe(80);
  });

  it('smooths a spike between two steady weigh-ins', () => {
    const { movingAverageOf } = useWeightTrend();

    const trend = movingAverageOf([
      entry('2026-08-01', 80),
      entry('2026-08-02', 84),
      entry('2026-08-03', 80),
    ]);

    expect(trend[2]?.kg).toBeCloseTo((80 + 84 + 80) / 3);
    expect(trend[2]?.kg).toBeLessThan(84);
  });

  it('starts the target band at exactly the first weigh-in', () => {
    const { targetBandOf } = useWeightTrend();

    const band = targetBandOf([entry('2026-08-01', 80)]);

    expect(band[0]).toMatchObject({ minKg: 80, maxKg: 80 });
  });

  it('widens the band by the target rate over a week', () => {
    const { targetBandOf } = useWeightTrend();

    const band = targetBandOf([entry('2026-08-01', 80), entry('2026-08-08', 80.5)]);

    expect(band[1]?.minKg).toBeCloseTo(80.3);
    expect(band[1]?.maxKg).toBeCloseTo(80.4);
  });

  it('has nothing to show without a single weigh-in', () => {
    const { targetBandOf } = useWeightTrend();

    expect(targetBandOf([])).toEqual([]);
  });
});
