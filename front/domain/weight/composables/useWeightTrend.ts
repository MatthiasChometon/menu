import type { WeightEntry } from '../types/weight.type';

export type TrendPoint = { date: string; kg: number };
export type TargetPoint = { date: string; minKg: number; maxKg: number };

const MOVING_AVERAGE_WINDOW = 3;

const chronological = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b): number => a.date.localeCompare(b.date));

// Smooths the day-to-day noise (water, food, timing) a raw weigh-in carries,
// without needing a fixed calendar cadence — it averages the last few
// ENTRIES rather than the last few days, which is what keeps it meaningful
// when somebody skips a week.
const movingAverageOf = (entries: WeightEntry[]): TrendPoint[] =>
  entries.map((entry, index): TrendPoint => {
    const window = entries.slice(Math.max(0, index - MOVING_AVERAGE_WINDOW + 1), index + 1);
    const average = window.reduce((total, item): number => total + item.kg, 0) / window.length;

    return { date: entry.date, kg: average };
  });

// Reads the moving average and the target corridor from the same diary: both
// are drawn on the one chart, and the chart is where they mean something.
export const useWeightTrend = (): {
  chronological: (entries: WeightEntry[]) => WeightEntry[];
  movingAverageOf: (entries: WeightEntry[]) => TrendPoint[];
  targetBandOf: (entries: WeightEntry[]) => TargetPoint[];
} => {
  const { weeksBetween } = useWeightDates();
  const { minKgPerWeek, maxKgPerWeek } = useWeightTargetRate();

  // A corridor rather than a line: it opens wider as the weeks pass, because
  // thirty and forty grams a week both belong to the same healthy pace, and
  // only their gap after a month is worth showing. One point per entry, so
  // the chart can walk the band and the data side by side without its own
  // interpolation.
  const targetBandOf = (entries: WeightEntry[]): TargetPoint[] => {
    const ordered = chronological(entries);
    const first = ordered[0];
    if (first === undefined) return [];

    return ordered.map((entry): TargetPoint => {
      const weeks = Math.max(0, weeksBetween(first.date, entry.date));

      return {
        date: entry.date,
        minKg: first.kg + minKgPerWeek * weeks,
        maxKg: first.kg + maxKgPerWeek * weeks,
      };
    });
  };

  return { chronological, movingAverageOf, targetBandOf };
};
