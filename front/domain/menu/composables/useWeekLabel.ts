const weekNames: Record<string, WeekName> = { '-1': 'last', '0': 'current', '1': 'next' };

// "Cette semaine" says where you are; "Semaine du 3 août" needs working out.
// Only the weeks near today get a name, because only those have one anybody
// uses.
export const useWeekLabel = (): {
  offsetOf: (weekOf: string, now: Date) => number;
  keyOf: (weekOf: string, now: Date) => WeekName | undefined;
} => {
  const offsetOf = (weekOf: string, now: Date): number =>
    // Windows are anchored to today, not the start of the calendar week, so
    // "this window" is measured from today's Paris day rather than from Monday.
    weeksBetween(startOf(now), weekOf);

  return {
    offsetOf,
    keyOf: (weekOf: string, now: Date): WeekName | undefined =>
      weekNames[String(offsetOf(weekOf, now))],
  };
};
