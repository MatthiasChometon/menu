// How far ahead a window may be composed. Far enough to plan a holiday, short
// enough that the list stays a list: nobody scrolls to December in August.
const WEEKS_AHEAD = 5;

// A window is the next few days, starting today. Seven by default — a week of
// food — but shorter when someone only wants to plan the days right ahead. It is
// never longer than seven: past that a weekday would repeat, and the days are
// stored by weekday.
export const DEFAULT_LENGTH = 7;
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// The household eats in France: "today" is the calendar day in Paris, whatever
// the zone of the device or of the server that renders the page. A day is then
// handled as a plain 'YYYY-MM-DD' string, and its arithmetic runs on UTC midnights,
// which have no daylight-saving hour to trip over.
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const utcMidnightOf = (day: string): number => Date.parse(`${day}T00:00:00Z`);

const parisDayOf = (instant: Date): string => PARIS_DAY.format(instant);

const shiftedBy = (day: string, days: number): string =>
  new Date(utcMidnightOf(day) + days * DAY_MS).toISOString().slice(0, 10);

/** Whole weeks from one 'YYYY-MM-DD' day to another, rounded. */
export const weeksBetween = (from: string, to: string): number =>
  Math.round((utcMidnightOf(to) - utcMidnightOf(from)) / (7 * DAY_MS));

/** The day a window starts on, as the Paris calendar day of the instant given,
 *  shifted by whole weeks. No longer snapped to Monday: a window runs from today,
 *  so it never plans a day that has already passed. */
export const startOf = (day: Date, weeks = 0): string => shiftedBy(parisDayOf(day), weeks * 7);

/** The windows open to composing: the one starting today, then the ones a week,
 *  two weeks… ahead. All start on the same weekday as today, so the rotation of
 *  their days is the same. */
export const weeksFrom = (day: Date): string[] =>
  Array.from({ length: WEEKS_AHEAD + 1 }, (_, offset): string => startOf(day, offset));

/** The window to open on: the one starting today, unless it is already composed,
 *  in which case the next. Composing is nearly always done ahead, but a fridge
 *  that is empty today beats one stocked for a week away. */
export const weekToCompose = (day: Date, plannedWeeks: string[]): string => {
  const current = startOf(day);

  return plannedWeeks.includes(current) ? startOf(day, 1) : current;
};

// Indexed by Date.getUTCDay(), Sunday first.
const WEEKDAYS: readonly DayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const weekdayAt = (index: number): DayKey => {
  const weekday = WEEKDAYS[index % 7];
  // Unreachable for a non-negative index; a silent fallback to Monday would
  // hide a bad one as a plausible wrong day.
  if (weekday === undefined) throw new RangeError(`No weekday at index ${index}`);

  return weekday;
};

/** The weekday keys a window covers, in order from the day it starts. A window
 *  beginning on a Friday reads Friday, Saturday, Sunday, Monday… so day zero is
 *  the day it actually begins. Kept to whole weekdays, one each, which is why the
 *  length never exceeds seven. */
export const daysFrom = (weekOf: string, length: number = DEFAULT_LENGTH): DayKey[] => {
  const startIndex = new Date(utcMidnightOf(weekOf)).getUTCDay();
  const span = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, length));

  return Array.from({ length: span }, (_, offset): DayKey => weekdayAt(startIndex + offset));
};

// The window being composed, and how many days it spans. Deliberately its own
// state, not the one the rest of the app is reading: browsing last week's
// shopping list should not decide which window the next one is written into —
// and a window can be composed long before it has a menu to browse at all.
export const usePlannerWeek = (): {
  week: Ref<string>;
  weeks: ComputedRef<string[]>;
  /** How many days the window spans, 3 to 7. */
  length: Ref<number>;
  /** The weekday keys of the window, in order from its first day. */
  days: ComputedRef<DayKey[]>;
  /** False until the browser's date is known: no window can start "today" from a
   *  page built weeks earlier. */
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
  const length = useState<number>('planner:length', (): number => DEFAULT_LENGTH);

  // Today is knowable only in the browser, and only after the markup built weeks
  // ago has been hydrated — reading it any earlier makes the server and the
  // client disagree about which day it is.
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
  // and leaves the window unnamed for good.
  if (getCurrentInstance() !== null) onMounted(start);

  const weeks = computed((): string[] => (now.value === undefined ? [] : weeksFrom(now.value)));

  const index = computed((): number => weeks.value.indexOf(week.value));

  const canGo = (step: number): boolean => weeks.value[index.value + step] !== undefined;

  const dateOf = (weekOf: string): string =>
    new Date(utcMidnightOf(weekOf)).toLocaleDateString(locale.value, {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

  return {
    week,
    weeks,
    length,
    days: computed((): DayKey[] => daysFrom(week.value, length.value)),
    isReady: computed((): boolean => now.value !== undefined && week.value !== ''),
    canGo,
    go: (step: number): void => {
      const next = weeks.value[index.value + step];
      if (next !== undefined) week.value = next;
    },
    dateOf,
    // "Cette semaine" and "La semaine prochaine" are how anybody names the days
    // right ahead; past two windows out only the date means anything.
    labelOf: (weekOf: string): string => {
      const offset = weeks.value.indexOf(weekOf);
      if (offset === 0) return t('menu.week.current');
      if (offset === 1) return t('menu.week.next');

      return `${t('menu.weekOf')} ${dateOf(weekOf)}`;
    },
  };
};
