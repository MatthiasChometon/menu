// How far ahead a week may be composed. Far enough to plan a holiday, short
// enough that the list stays a list: nobody scrolls to December in August.
const WEEKS_AHEAD = 5;

const pad = (value: number): string => String(value).padStart(2, '0');

const asWeekOf = (day: Date): string =>
  `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

/** Monday of the week the given day falls in, shifted by whole weeks. */
export const mondayOf = (day: Date, weeks = 0): string => {
  const monday = new Date(day);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weeks * 7);

  return asWeekOf(monday);
};

/** The weeks open to composing: this one, then the ones to come. A week gone
 *  by is not offered — there is nothing left to cook in it. */
export const weeksFrom = (day: Date): string[] =>
  Array.from({ length: WEEKS_AHEAD + 1 }, (_, offset): string => mondayOf(day, offset));

/** The week to open on: the current one while it still has nothing to eat,
 *  the next one otherwise. Composing is nearly always done ahead, but a Monday
 *  with an empty fridge beats planning for a week away. */
export const weekToCompose = (day: Date, plannedWeeks: string[]): string => {
  const current = mondayOf(day);

  return plannedWeeks.includes(current) ? mondayOf(day, 1) : current;
};

// The week being composed. Deliberately its own state, not the one the rest of
// the app is reading: browsing last week's shopping list should not decide
// which week the next one is written into — and a week can be composed long
// before it has a published menu to browse at all.
export const usePlannerWeek = (): {
  week: Ref<string>;
  weeks: ComputedRef<string[]>;
  /** False until the browser's date is known: no week can be called "this
   *  one" from a page built weeks earlier. */
  isReady: ComputedRef<boolean>;
  go: (step: number) => void;
  canGo: (step: number) => boolean;
  labelOf: (weekOf: string) => string;
  dateOf: (weekOf: string) => string;
} => {
  const { menus } = useMenu();
  const { t, locale } = useNuxtApp().$i18n;

  const week = useState<string>('planner:week', (): string => '');
  const now = useState<Date | undefined>('planner:now', (): undefined => undefined);

  // Today is knowable only in the browser, and only after the markup built
  // weeks ago has been hydrated — reading it any earlier makes the server and
  // the client disagree about which Monday it is.
  const start = (): void => {
    if (now.value !== undefined) return;

    const today = new Date();
    now.value = today;

    if (week.value === '')
      week.value = weekToCompose(
        today,
        menus.map((menu): string => menu.weekOf),
      );
  };

  // Guarded: this composable is also reached from usePlanner, which components
  // call outside setup. An unguarded onMounted there attaches to nothing, warns,
  // and leaves the week unnamed for good.
  if (getCurrentInstance() !== null) onMounted(start);

  const weeks = computed((): string[] => (now.value === undefined ? [] : weeksFrom(now.value)));

  const index = computed((): number => weeks.value.indexOf(week.value));

  const canGo = (step: number): boolean => weeks.value[index.value + step] !== undefined;

  const dateOf = (weekOf: string): string =>
    new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
      day: 'numeric',
      month: 'long',
    });

  return {
    week,
    weeks,
    isReady: computed((): boolean => now.value !== undefined && week.value !== ''),
    canGo,
    go: (step: number): void => {
      const next = weeks.value[index.value + step];
      if (next !== undefined) week.value = next;
    },
    dateOf,
    // "Cette semaine" and "La semaine prochaine" are how anybody says it; past
    // two weeks out only the date means anything.
    labelOf: (weekOf: string): string => {
      const offset = weeks.value.indexOf(weekOf);
      if (offset === 0) return t('menu.week.current');
      if (offset === 1) return t('menu.week.next');

      return `${t('menu.weekOf')} ${dateOf(weekOf)}`;
    },
  };
};
