const DAY_MS = 24 * 60 * 60 * 1000;

const mondayOf = (weekOf: string): Date => new Date(`${weekOf}T00:00:00`);

// Monday of the week the given day falls in, so two dates in the same week
// compare equal.
const startOfWeek = (day: Date): Date => {
  const monday = new Date(day);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return monday;
};

// "Cette semaine" says where you are; "Semaine du 3 août" needs working out.
// Only the weeks near today get a name, because only those have one anybody
// uses.
export const useWeekLabel = (): {
  offsetOf: (weekOf: string, now: Date) => number;
  keyOf: (weekOf: string, now: Date) => string | undefined;
} => {
  const offsetOf = (weekOf: string, now: Date): number =>
    Math.round((mondayOf(weekOf).getTime() - startOfWeek(now).getTime()) / (7 * DAY_MS));

  return {
    offsetOf,
    keyOf: (weekOf: string, now: Date): string | undefined =>
      ({ '-1': 'last', '0': 'current', '1': 'next' })[String(offsetOf(weekOf, now))],
  };
};
