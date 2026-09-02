import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { WeightEntry } from '../../weight/types/weight.type';

export type ProgressionWeek = {
  weekOf: string;
  adherenceRate: number;
  /** Undefined when fewer than two weigh-ins fell inside that week. */
  weightDeltaKg: number | undefined;
};

export type ProgressionHint = 'insufficientData' | 'moreRegularWithAdherence' | 'noClearLink';

const ADHERENT_RATE = 0.9;

// A weigh-in diary and a meal diary, read side by side rather than argued
// from separately: whether the weeks eaten closely to plan are also the ones
// the scale moved on. The hint below only ever describes what lines up
// across the weeks actually logged — never that one causes the other.
export const useProgressionTable = (): {
  weeksOf: (history: WeekAdherence[], entries: WeightEntry[]) => ProgressionWeek[];
  hintOf: (weeks: ProgressionWeek[]) => ProgressionHint;
} => {
  const { shiftDate } = useWeightDates();

  const weightDeltaOf = (entries: WeightEntry[], weekOf: string): number | undefined => {
    const weekEnd = shiftDate(weekOf, 6);
    const withinWeek = entries
      .filter((entry): boolean => entry.date >= weekOf && entry.date <= weekEnd)
      .sort((left, right): number => left.date.localeCompare(right.date));
    const first = withinWeek[0];
    const last = withinWeek.at(-1);

    return first === undefined || last === undefined || first === last
      ? undefined
      : Math.round((last.kg - first.kg) * 10) / 10;
  };

  const averageDeltaOf = (weeks: ProgressionWeek[]): number =>
    weeks.reduce((total, week): number => total + (week.weightDeltaKg ?? 0), 0) / weeks.length;

  return {
    weeksOf: (history: WeekAdherence[], entries: WeightEntry[]): ProgressionWeek[] =>
      history.map((week): ProgressionWeek => ({
        weekOf: week.weekOf,
        adherenceRate: week.rate,
        weightDeltaKg: weightDeltaOf(entries, week.weekOf),
      })),
    hintOf: (weeks: ProgressionWeek[]): ProgressionHint => {
      const comparable = weeks.filter((week): boolean => week.weightDeltaKg !== undefined);
      const adherent = comparable.filter((week): boolean => week.adherenceRate >= ADHERENT_RATE);
      const other = comparable.filter((week): boolean => week.adherenceRate < ADHERENT_RATE);

      if (adherent.length === 0 || other.length === 0) return 'insufficientData';

      return averageDeltaOf(adherent) > averageDeltaOf(other)
        ? 'moreRegularWithAdherence'
        : 'noClearLink';
    },
  };
};
