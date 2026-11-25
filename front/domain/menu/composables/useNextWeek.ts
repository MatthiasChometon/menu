import { shiftedBy, startOf } from '../../planner/composables/usePlannerWeek';

// 0 for Monday … 6 for Sunday, of a 'YYYY-MM-DD' day. Read on UTC midnight, which
// has no daylight-saving hour and no device zone to trip over.
const weekdayOf = (day: string): number => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

// Monday of the week after the one the given instant falls in, on the Paris
// calendar: the household eats in France, whatever the zone of the device.
const mondayAfter = (instant: Date): string => {
  const today = startOf(instant);

  return shiftedBy(today, 7 - weekdayOf(today));
};

// Whether the week to come has a menu yet. Asked of the week to come rather
// than of the newest menu: a menu that stops at last week and one that stops at
// this week both leave the reader with nothing to eat on Monday, and both
// deserve to be told so.
export const useNextWeek = (): {
  weekOf: ComputedRef<string | undefined>;
  isPlanned: ComputedRef<boolean>;
  /** Monday of the week after the given day, exposed so it can be tested
   *  without freezing the clock the rendering depends on. */
  weekAfter: (day: Date) => string;
} => {
  const { menus } = useMenu();
  const isMounted = useMounted();

  // The build date is not the reader's date, so this waits for the browser.
  const weekOf = computed((): string | undefined =>
    isMounted.value ? mondayAfter(new Date()) : undefined,
  );

  return {
    weekAfter: (day: Date): string => mondayAfter(day),
    weekOf,
    isPlanned: computed(
      (): boolean =>
        weekOf.value !== undefined && menus.some((menu): boolean => menu.weekOf === weekOf.value),
    ),
  };
};
