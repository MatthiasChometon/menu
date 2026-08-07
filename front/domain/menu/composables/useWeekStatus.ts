const DAY_MS = 24 * 60 * 60 * 1000;

const mondayOf = (weekOf: string): Date => new Date(`${weekOf}T00:00:00`);

export const useWeekStatus = (): {
  statusOf: (weekOf: string, now: Date) => WeekStatus;
  dayIndexOf: (now: Date) => number;
  isWithin: (weekOf: string, now: Date) => boolean;
  weekToShow: (weekOfList: string[], now: Date) => string | undefined;
} => {
  const isWithin = (weekOf: string, now: Date): boolean => {
    const start = mondayOf(weekOf).getTime();
    return now.getTime() >= start && now.getTime() < start + 7 * DAY_MS;
  };

  return {
    isWithin,
    statusOf: (weekOf: string, now: Date): WeekStatus => {
      if (isWithin(weekOf, now)) return 'current';
      return now.getTime() < mondayOf(weekOf).getTime() ? 'upcoming' : 'past';
    },
    // Monday-first index, so it lines up with how the days are stored.
    dayIndexOf: (now: Date): number => (now.getDay() + 6) % 7,
    // The week to open on. Planning ahead means the newest menu is often next
    // week's: opening on it would move the shopping list and the fridge off the
    // week actually being lived. So today's week wins, then the one just gone
    // — the fridge still holds its leftovers — and only then the nearest to come.
    weekToShow: (weekOfList: string[], now: Date): string | undefined => {
      const sorted = [...weekOfList].sort((left, right): number => left.localeCompare(right));

      return (
        sorted.find((weekOf): boolean => isWithin(weekOf, now)) ??
        sorted.findLast((weekOf): boolean => mondayOf(weekOf).getTime() < now.getTime()) ??
        sorted[0]
      );
    },
  };
};
