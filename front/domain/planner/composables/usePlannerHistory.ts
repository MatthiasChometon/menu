/** A week as it stood the last time it was spread across its days — kept on
 *  the device so the composer can look back without an account. */
export type ComposedWeekEntry = {
  weekOf: string;
  composedAt: string;
  chosen: Partial<Record<RecipeSlot, string[]>>;
};

// Enough to look back a couple of windows and pick a duplicate from, without
// the list growing forever on a device nobody clears.
const MAX_ENTRIES = 8;

// How many past weeks the generator looks at by default to avoid repeating
// itself, when the reader has not set their own window. Any deeper and "you
// just had this" stops being true; any shallower and a handful of dishes
// still feels like it is on loop every fortnight.
export const DEFAULT_VARIETY_WINDOW_WEEKS = 3;

// The heaviest a repeat can weigh against a dish that has not shown up
// recently, reached only by a dish used in the very last composed week.
const PEAK_REPEAT_PENALTY = 20;

const byMostRecent = (left: ComposedWeekEntry, right: ComposedWeekEntry): number =>
  right.composedAt.localeCompare(left.composedAt);

/** How many weeks ago a dish last appeared, 0 for the most recent of the
 *  windows besides the one being worked on. Undefined for a dish that never
 *  appeared inside the window at all. Pure so it is testable without
 *  touching localStorage. */
export const weeksAgoOf = (
  entries: ComposedWeekEntry[],
  excludingWeek: string,
  recipeId: string,
  windowWeeks: number = DEFAULT_VARIETY_WINDOW_WEEKS,
): number | undefined => {
  const others = entries
    .filter((entry): boolean => entry.weekOf !== excludingWeek)
    .sort(byMostRecent)
    .slice(0, windowWeeks);

  const weeksAgo = others.findIndex((entry): boolean =>
    Object.values(entry.chosen).some((ids): boolean => (ids ?? []).includes(recipeId)),
  );

  return weeksAgo === -1 ? undefined : weeksAgo;
};

/** How much a dish should lose against the others for having shown up in a
 *  recent week — not a ban, a nudge: the closer that week sits, the more it
 *  should lose, tapering to nothing at the edge of the window. */
export const repeatPenaltyOf = (
  entries: ComposedWeekEntry[],
  excludingWeek: string,
  recipeId: string,
  windowWeeks: number = DEFAULT_VARIETY_WINDOW_WEEKS,
): number => {
  const weeksAgo = weeksAgoOf(entries, excludingWeek, recipeId, windowWeeks);
  if (weeksAgo === undefined) return 0;

  return (PEAK_REPEAT_PENALTY * (windowWeeks - weeksAgo)) / windowWeeks;
};

/** Replaces a week's entry if it was already recorded, keeping the list
 *  bounded and most-recent first. */
export const withEntryUpserted = (
  entries: ComposedWeekEntry[],
  entry: ComposedWeekEntry,
  maxEntries: number = MAX_ENTRIES,
): ComposedWeekEntry[] =>
  [entry, ...entries.filter((existing): boolean => existing.weekOf !== entry.weekOf)]
    .sort(byMostRecent)
    .slice(0, maxEntries);

// One instance for the whole app: usePlanner() is called from several
// components at once, and a spread recorded from one instance's fresh
// useLocalStorage() would not be visible from another's until a storage
// event — which never fires back into the tab that made the write. Sharing
// the ref is what lets a spread on the composer page show up immediately in
// the same request for past weeks.
let sharedEntries: Ref<ComposedWeekEntry[]> | undefined;

const entriesRef = (): Ref<ComposedWeekEntry[]> => {
  sharedEntries ??= useLocalStorage<ComposedWeekEntry[]>('planner:history', []);
  return sharedEntries;
};

/** The reader's own take on how many weeks the variety window should span.
 *  Kept apart from the entries themselves, and as an object rather than a
 *  bare number, because a raw `undefined` default does not round-trip
 *  through JSON the way a missing object key does. */
type HistorySettings = { varietyWindowWeeks: number | undefined };

const DEFAULT_HISTORY_SETTINGS: HistorySettings = { varietyWindowWeeks: undefined };

let sharedSettings: Ref<HistorySettings> | undefined;

const settingsRef = (): Ref<HistorySettings> => {
  sharedSettings ??= useLocalStorage<HistorySettings>(
    'planner:historySettings',
    DEFAULT_HISTORY_SETTINGS,
  );
  return sharedSettings;
};

// A week counts as composed once it has actually been spread onto its days —
// picking dishes that are never placed is not a week worth remembering.
export const usePlannerHistory = (): {
  entries: Ref<ComposedWeekEntry[]>;
  /** Remembers this week's selection as the one it was last spread with. */
  record: (weekOf: string, chosen: Partial<Record<RecipeSlot, string[]>>) => void;
  /** The window the penalty currently looks back over — the reader's own
   *  setting, or the default when they never set one. */
  varietyWindowWeeks: ComputedRef<number>;
  /** The reader's raw choice, undefined meaning "the default" — what the
   *  preferences panel needs to show the right option selected. */
  varietyWindowWeeksSetting: ComputedRef<number | undefined>;
  setVarietyWindowWeeks: (weeks: number | undefined) => void;
  /** How much this dish should lose against the others, for having shown up
   *  in one of the recent weeks. Zero for a dish that has not. */
  repeatPenalty: (excludingWeek: string, recipeId: string) => number;
  /** Past weeks, most recent first, to offer as a base for a new one. */
  entriesExcept: (weekOf: string) => ComposedWeekEntry[];
} => {
  const entries = entriesRef();
  const settings = settingsRef();

  const varietyWindowWeeks = computed(
    (): number => settings.value.varietyWindowWeeks ?? DEFAULT_VARIETY_WINDOW_WEEKS,
  );

  return {
    entries,
    record: (weekOf: string, chosen: Partial<Record<RecipeSlot, string[]>>): void => {
      entries.value = withEntryUpserted(entries.value, {
        weekOf,
        chosen,
        composedAt: new Date().toISOString(),
      });
    },
    varietyWindowWeeks,
    varietyWindowWeeksSetting: computed((): number | undefined => settings.value.varietyWindowWeeks),
    setVarietyWindowWeeks: (weeks: number | undefined): void => {
      settings.value = { ...settings.value, varietyWindowWeeks: weeks };
    },
    repeatPenalty: (excludingWeek: string, recipeId: string): number =>
      repeatPenaltyOf(entries.value, excludingWeek, recipeId, varietyWindowWeeks.value),
    entriesExcept: (weekOf: string): ComposedWeekEntry[] =>
      entries.value.filter((entry): boolean => entry.weekOf !== weekOf).sort(byMostRecent),
  };
};
