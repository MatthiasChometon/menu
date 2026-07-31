const DAY_MS = 24 * 60 * 60 * 1000;

const mondayOf = (weekOf: string): Date => new Date(`${weekOf}T00:00:00`);

export const useWeekStatus = (): {
  statusOf: (weekOf: string, now: Date) => WeekStatus;
  dayIndexOf: (now: Date) => number;
  isWithin: (weekOf: string, now: Date) => boolean;
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
  };
};
