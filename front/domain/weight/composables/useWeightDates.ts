const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parse = (date: string): Date => new Date(`${date}T00:00:00`);

const pad = (value: number): string => String(value).padStart(2, '0');

// Shared by the log (bounding a date to "today"), the trend and the coach
// (both read a rate in kg per week) and the chart (positioning a date on the
// x axis) — one place doing day arithmetic keeps all four in agreement.
const isoOf = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const useWeightDates = (): {
  todayDate: () => string;
  isValidDate: (date: string) => boolean;
  daysBetween: (from: string, to: string) => number;
  weeksBetween: (from: string, to: string) => number;
  shiftDate: (date: string, days: number) => string;
} => ({
  todayDate: (): string => isoOf(new Date()),
  isValidDate: (date: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parse(date).getTime()),
  daysBetween: (from: string, to: string): number =>
    Math.round((parse(to).getTime() - parse(from).getTime()) / MS_PER_DAY),
  weeksBetween: (from: string, to: string): number =>
    (parse(to).getTime() - parse(from).getTime()) / MS_PER_DAY / 7,
  shiftDate: (date: string, days: number): string => {
    const shifted = parse(date);
    shifted.setDate(shifted.getDate() + days);
    return isoOf(shifted);
  },
});
