const pad = (value: number): string => String(value).padStart(2, '0');

const asWeekOf = (day: Date): string =>
  `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

// Monday of the week after the one the given day falls in.
const mondayAfter = (day: Date): Date => {
  const monday = new Date(day);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + 7);

  return monday;
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
    isMounted.value ? asWeekOf(mondayAfter(new Date())) : undefined,
  );

  return {
    weekAfter: (day: Date): string => asWeekOf(mondayAfter(day)),
    weekOf,
    isPlanned: computed(
      (): boolean =>
        weekOf.value !== undefined && menus.some((menu): boolean => menu.weekOf === weekOf.value),
    ),
  };
};
