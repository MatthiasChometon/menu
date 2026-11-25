import { shiftedBy, startOf } from '../../planner/composables/usePlannerWeek';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A weigh-in is a calendar day in Paris, kept as a plain 'YYYY-MM-DD' string and
// compared on UTC midnights: no device zone and no daylight-saving hour (a week
// is 167 hours long on a local clock twice a year) can move it. The Paris day
// and the shift come from the planner, which already owns that arithmetic.
const utcMidnightOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);

// Shared by the log (bounding a date to "today"), the trend and the coach
// (both read a rate in kg per week) and the chart (positioning a date on the
// x axis) — one place doing day arithmetic keeps all four in agreement.
export const useWeightDates = (): {
  todayDate: () => string;
  isValidDate: (date: string) => boolean;
  daysBetween: (from: string, to: string) => number;
  weeksBetween: (from: string, to: string) => number;
  shiftDate: (date: string, days: number) => string;
  dayLabelOf: (date: string, locale: string, format: Intl.DateTimeFormatOptions) => string;
} => ({
  todayDate: (): string => startOf(new Date()),
  // Round-tripped, because the parser is lenient: it reads 2026-02-31 as the
  // 3rd of March rather than refusing it.
  isValidDate: (date: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(utcMidnightOf(date)) &&
    shiftedBy(date, 0) === date,
  daysBetween: (from: string, to: string): number =>
    Math.round((utcMidnightOf(to) - utcMidnightOf(from)) / MS_PER_DAY),
  // Not the planner's weeksBetween: that one rounds to whole weeks, and a rate
  // in kg per week needs the fraction.
  weeksBetween: (from: string, to: string): number =>
    (utcMidnightOf(to) - utcMidnightOf(from)) / MS_PER_DAY / 7,
  shiftDate: (date: string, days: number): string => shiftedBy(date, days),
  // Read back on UTC, the zone the day was built in, so the label is the day
  // stored whatever the device says.
  dayLabelOf: (date: string, locale: string, format: Intl.DateTimeFormatOptions): string =>
    new Date(utcMidnightOf(date)).toLocaleDateString(locale, { ...format, timeZone: 'UTC' }),
});
