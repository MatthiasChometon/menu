import { shiftedBy, startOf } from '../../planner/composables/usePlannerWeek';

const REMINDER_IDS: readonly ReminderId[] = ['creatine', 'water', 'vitaminD'];

const { storedValue, isRecordOf, isArrayOf } = useStoredValue();

const isReminderId = (value: unknown): value is ReminderId =>
  REMINDER_IDS.some((id): boolean => id === value);
const isGlassCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_GLASSES;

const REMINDER_ICON: Record<ReminderId, string> = {
  creatine: 'i-lucide-pill',
  water: 'i-lucide-glass-water',
  vitaminD: 'i-lucide-sun',
};

// A glass at 500 ml: seven of them (3.5 L) meets the daily target, eight
// (4 L) is the top of the range — see nutrition_muscu. Kept here rather than
// pulled from the profile: the target is the same for everybody, dietary
// water is not scaled the way food is.
const GLASS_ML = 500;
const TARGET_GLASSES = 7;
const MAX_GLASSES = 8;

// Held for the life of the app, like useCookingLog's stores: several
// components read and write the same day's checklist, and two independent
// useLocalStorage() calls for the same key are not guaranteed to see each
// other's writes within one tab.
let reminderStore: Ref<Record<string, ReminderId[]>> | undefined;
const reminderStateRef = (): Ref<Record<string, ReminderId[]>> => {
  reminderStore ??= storedValue<Record<string, ReminderId[]>>(
    'today:reminders',
    {},
    isRecordOf(isArrayOf(isReminderId)),
  );
  return reminderStore;
};

let hydrationStore: Ref<Record<string, number>> | undefined;
const hydrationStateRef = (): Ref<Record<string, number>> => {
  hydrationStore ??= storedValue<Record<string, number>>(
    'today:hydration',
    {},
    isRecordOf(isGlassCount),
  );
  return hydrationStore;
};

const isDayComplete = (records: Record<string, ReminderId[]>, dateKey: string): boolean =>
  REMINDER_IDS.every((id): boolean => (records[dateKey] ?? []).includes(id));

// Counts backward from today, or from yesterday when today is not finished
// yet — an unfinished today must not erase a streak already earned — until a
// day breaks the chain. Days are Paris 'YYYY-MM-DD' strings, so stepping back a
// day never meets a daylight-saving hour.
const streakEndingAt = (records: Record<string, ReminderId[]>, todayKey: string): number => {
  let cursor = isDayComplete(records, todayKey) ? todayKey : shiftedBy(todayKey, -1);

  let streak = 0;
  while (isDayComplete(records, cursor)) {
    streak += 1;
    cursor = shiftedBy(cursor, -1);
  }

  return streak;
};

// The habits worth doing every single day (see the reminders in
// domain/menu), and the water drunk today — both diaries kept per calendar
// day in localStorage, an MVP stand-in for a back end neither needs yet.
export const useDailyChecklist = (
  now: MaybeRefOrGetter<Date | undefined>,
): {
  isReady: ComputedRef<boolean>;
  reminderItems: ComputedRef<ReminderItem[]>;
  reminderStreak: ComputedRef<number>;
  toggleReminder: (id: ReminderId) => void;
  hydrationGlasses: ComputedRef<number>;
  hydrationTargetGlasses: number;
  hydrationMaxGlasses: number;
  hydrationLiters: ComputedRef<number>;
  hasReachedHydrationTarget: ComputedRef<boolean>;
  toggleHydrationGlass: (index: number) => void;
  reset: () => void;
} => {
  const today = computed((): Date | undefined => toValue(now));
  const dateKey = computed((): string | undefined =>
    today.value === undefined ? undefined : startOf(today.value),
  );

  const checkedToday = computed((): ReminderId[] =>
    dateKey.value === undefined ? [] : (reminderStateRef().value[dateKey.value] ?? []),
  );

  const hydrationGlasses = computed((): number =>
    dateKey.value === undefined ? 0 : (hydrationStateRef().value[dateKey.value] ?? 0),
  );

  const setHydrationGlasses = (count: number): void => {
    const key = dateKey.value;
    if (key === undefined) return;

    hydrationStateRef().value = { ...hydrationStateRef().value, [key]: Math.max(0, count) };
  };

  return {
    isReady: computed((): boolean => dateKey.value !== undefined),
    reminderItems: computed((): ReminderItem[] =>
      REMINDER_IDS.map((id): ReminderItem => ({
        id,
        icon: REMINDER_ICON[id],
        isChecked: checkedToday.value.includes(id),
      })),
    ),
    reminderStreak: computed((): number =>
      dateKey.value === undefined ? 0 : streakEndingAt(reminderStateRef().value, dateKey.value),
    ),
    toggleReminder: (id: ReminderId): void => {
      const key = dateKey.value;
      if (key === undefined) return;

      const store = reminderStateRef();
      const current = store.value[key] ?? [];
      store.value = {
        ...store.value,
        [key]: current.includes(id)
          ? current.filter((entry): boolean => entry !== id)
          : [...current, id],
      };
    },
    hydrationGlasses,
    hydrationTargetGlasses: TARGET_GLASSES,
    hydrationMaxGlasses: MAX_GLASSES,
    hydrationLiters: computed((): number => (hydrationGlasses.value * GLASS_ML) / 1000),
    hasReachedHydrationTarget: computed((): boolean => hydrationGlasses.value >= TARGET_GLASSES),
    // Tapping a glass fills up to it; tapping the last full glass again empties
    // it — the same fill-up-to interaction as a star rating.
    toggleHydrationGlass: (index: number): void => {
      setHydrationGlasses(hydrationGlasses.value === index + 1 ? index : index + 1);
    },
    reset: (): void => {
      reminderStateRef().value = {};
      hydrationStateRef().value = {};
    },
  };
};
