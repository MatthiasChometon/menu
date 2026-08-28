const DAY_MS = 24 * 60 * 60 * 1000;

const mondayOf = (weekOf: string): Date => new Date(`${weekOf}T00:00:00`);

// Midnight of the given day. Windows are anchored to today, not the start of the
// calendar week, so "this window" is measured from today rather than from Monday.
const startOfDay = (day: Date): Date => {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  return start;
};

// "Cette semaine" says where you are; "Semaine du 3 août" needs working out.
// Only the weeks near today get a name, because only those have one anybody
// uses.
export const useWeekLabel = (): {
  offsetOf: (weekOf: string, now: Date) => number;
  keyOf: (weekOf: string, now: Date) => string | undefined;
} => {
  const offsetOf = (weekOf: string, now: Date): number =>
    Math.round((mondayOf(weekOf).getTime() - startOfDay(now).getTime()) / (7 * DAY_MS));

  return {
    offsetOf,
    keyOf: (weekOf: string, now: Date): string | undefined =>
      ({ '-1': 'last', '0': 'current', '1': 'next' })[String(offsetOf(weekOf, now))],
  };
};
