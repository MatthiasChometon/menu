import type { WeightEntry } from '../types/weight.type';

export type CoachStatus = 'notEnoughData' | 'tooSlow' | 'onTrack' | 'tooFast';

export type CoachAdvice = {
  status: CoachStatus;
  /** Actual pace over the recent window, undefined only when there is not
   *  enough data to compute one. */
  weeklyRateKg: number | undefined;
  /** A rough daily calorie nudge, in the direction that closes the gap. */
  kcalAdjustment: number | undefined;
};

const RECENT_WINDOW_DAYS = 21;
const INCREASE_KCAL = 150;
const DECREASE_KCAL = -100;

const chronological = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b): number => a.date.localeCompare(b.date));

// The verdict is the point of the whole feature: honest, and useless without
// enough data — kept pure and tested on its own so a wrong verdict can never
// hide behind a chart that merely looks right.
export const useWeightCoach = (): { adviceOf: (entries: WeightEntry[]) => CoachAdvice } => {
  const { weeksBetween, shiftDate } = useWeightDates();
  const { minKgPerWeek, maxKgPerWeek } = useWeightTargetRate();

  // The last three weeks, or the last two weigh-ins when the diary is too
  // sparse to fill that window — a pace only means something across at least
  // two points, whichever two are the most recent ones logged.
  const recentWindowOf = (ordered: WeightEntry[]): WeightEntry[] => {
    const last = ordered.at(-1);
    if (last === undefined) return [];

    const cutoff = shiftDate(last.date, -RECENT_WINDOW_DAYS);
    const withinWindow = ordered.filter((entry): boolean => entry.date >= cutoff);

    return withinWindow.length >= 2 ? withinWindow : ordered.slice(-2);
  };

  const adviceOf = (entries: WeightEntry[]): CoachAdvice => {
    const window = recentWindowOf(chronological(entries));
    const first = window[0];
    const last = window.at(-1);
    const weeks =
      first === undefined || last === undefined ? 0 : weeksBetween(first.date, last.date);

    if (first === undefined || last === undefined || first === last || weeks <= 0)
      return { status: 'notEnoughData', weeklyRateKg: undefined, kcalAdjustment: undefined };

    const weeklyRateKg = (last.kg - first.kg) / weeks;

    if (weeklyRateKg < minKgPerWeek)
      return { status: 'tooSlow', weeklyRateKg, kcalAdjustment: INCREASE_KCAL };
    if (weeklyRateKg > maxKgPerWeek)
      return { status: 'tooFast', weeklyRateKg, kcalAdjustment: DECREASE_KCAL };

    return { status: 'onTrack', weeklyRateKg, kcalAdjustment: undefined };
  };

  return { adviceOf };
};
