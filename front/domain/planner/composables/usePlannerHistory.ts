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

// How many past weeks the generator looks at to avoid repeating itself. Any
// deeper and "you just had this" stops being true.
const RECENT_WEEKS = 2;

const byMostRecent = (left: ComposedWeekEntry, right: ComposedWeekEntry): number =>
  right.composedAt.localeCompare(left.composedAt);

/** Every dish chosen in the most recent windows besides the one being worked
 *  on — what the generator should steer away from. Pure so it is testable
 *  without touching localStorage. */
export const recentDishIdsFrom = (
  entries: ComposedWeekEntry[],
  excludingWeek: string,
  count: number = RECENT_WEEKS,
): Set<string> => {
  const others = entries
    .filter((entry): boolean => entry.weekOf !== excludingWeek)
    .sort(byMostRecent)
    .slice(0, count);

  return new Set(
    others.flatMap((entry): string[] => Object.values(entry.chosen).flatMap((ids): string[] => ids ?? [])),
  );
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

// A week counts as composed once it has actually been spread onto its days —
// picking dishes that are never placed is not a week worth remembering.
export const usePlannerHistory = (): {
  entries: Ref<ComposedWeekEntry[]>;
  /** Remembers this week's selection as the one it was last spread with. */
  record: (weekOf: string, chosen: Partial<Record<RecipeSlot, string[]>>) => void;
  recentDishIds: (excludingWeek: string) => Set<string>;
  /** Past weeks, most recent first, to offer as a base for a new one. */
  entriesExcept: (weekOf: string) => ComposedWeekEntry[];
} => {
  const entries = entriesRef();

  return {
    entries,
    record: (weekOf: string, chosen: Partial<Record<RecipeSlot, string[]>>): void => {
      entries.value = withEntryUpserted(entries.value, {
        weekOf,
        chosen,
        composedAt: new Date().toISOString(),
      });
    },
    recentDishIds: (excludingWeek: string): Set<string> =>
      recentDishIdsFrom(entries.value, excludingWeek),
    entriesExcept: (weekOf: string): ComposedWeekEntry[] =>
      entries.value.filter((entry): boolean => entry.weekOf !== weekOf).sort(byMostRecent),
  };
};
