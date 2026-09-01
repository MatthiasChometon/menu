export type WeekAdherence = {
  weekOf: string;
  eatenCount: number;
  totalCount: number;
  /** Share of planned meals actually eaten, 0 to 1. */
  rate: number;
};

const HISTORY_LENGTH = 4;

let historyStore: Ref<WeekAdherence[]> | undefined;

// One store for every week ever looked at, not one per week: unlike the cooking
// diary, the trend needs to compare weeks against each other, so they live
// together under a single key.
const historyOf = (): Ref<WeekAdherence[]> => {
  historyStore ??= useLocalStorage<WeekAdherence[]>('adherence:history', []);
  return historyStore;
};

const withWeek = (history: WeekAdherence[], entry: WeekAdherence): WeekAdherence[] =>
  [...history.filter((week): boolean => week.weekOf !== entry.weekOf), entry].sort(
    (left, right): number => left.weekOf.localeCompare(right.weekOf),
  );

// How well a week planned turned into meals actually eaten: the ring on the
// home page, plus a short trend behind it so progress — or the lack of it —
// shows across weeks, not just this one. A menu says what to eat; the count of
// ticked meals says what actually happened, which is what the ring is for.
export const useAdherence = (
  menu: MaybeRefOrGetter<Menu | undefined>,
): {
  eatenCount: ComputedRef<number>;
  totalCount: ComputedRef<number>;
  rate: ComputedRef<number>;
  /** The current week and, before it, up to three earlier ones this device has
   *  tallied — oldest first. */
  history: ComputedRef<WeekAdherence[]>;
} => {
  const totalCount = computed((): number =>
    (toValue(menu)?.days ?? []).reduce((total, day): number => total + day.meals.length, 0),
  );

  const eatenCount = computed((): number => {
    const current = toValue(menu);
    if (current === undefined) return 0;

    const { isEaten } = useCookingLog(current.weekOf);
    return current.days.reduce(
      (total, day): number =>
        total + day.meals.filter((meal): boolean => isEaten(day.key, meal.slot)).length,
      0,
    );
  });

  const rate = computed((): number =>
    totalCount.value === 0 ? 0 : eatenCount.value / totalCount.value,
  );

  const recordCurrentWeek = (): void => {
    const weekOf = toValue(menu)?.weekOf;
    if (weekOf === undefined || totalCount.value === 0) return;

    historyOf().value = withWeek(historyOf().value, {
      weekOf,
      eatenCount: eatenCount.value,
      totalCount: totalCount.value,
      rate: rate.value,
    });
  };

  // Remembered once the page has actually mounted in a reader's browser, and
  // again whenever the tally moves after that. A prerendered page has no
  // reader's localStorage to remember anything from, so writing here during
  // SSR would hand the client a week the client was never going to render
  // itself on its own first pass — exactly what a hydration mismatch is. A
  // bare call to this composable, as from a test, has no lifecycle to hook, so
  // it is skipped there too.
  if (getCurrentInstance() !== null) {
    onMounted(recordCurrentWeek);
    watch(
      [(): string | undefined => toValue(menu)?.weekOf, eatenCount, totalCount],
      recordCurrentWeek,
    );
  }

  return {
    eatenCount,
    totalCount,
    rate,
    history: computed((): WeekAdherence[] => historyOf().value.slice(-HISTORY_LENGTH)),
  };
};
