/** What the composer should avoid, or lean towards, when it picks or suggests
 *  dishes on its own. Kept on the device, not the account: these are steering
 *  hints for this browser's composing sessions, not part of the week itself. */
export type PlannerPreferences = {
  /** Kinds of the savoury dish never picked automatically — "no fish" and the
   *  like. The reader can still choose one by hand; this only steers the
   *  generator and the suggestions away from it. */
  excludedKinds: DishKind[];
  /** No automatic pick takes longer than this to cook. Undefined means no cap. */
  maxPrepMinutes: number | undefined;
  /** No dish should repeat more than this many times across the window.
   *  Undefined leaves the usual floor per group as the only rule. */
  maxRepeatsPerWeek: number | undefined;
  /** What the week should cost, in euros. Undefined leaves cost out of the
   *  picture entirely — nothing is scored against it and nothing is shown. */
  weeklyBudget: number | undefined;
};

const DEFAULT_PREFERENCES: PlannerPreferences = {
  excludedKinds: [],
  maxPrepMinutes: undefined,
  maxRepeatsPerWeek: undefined,
  weeklyBudget: undefined,
};

// A dish kind can be turned off and back on without the exclusion list
// growing duplicates or losing order — order only matters for the chips.
export const withExclusionToggled = (
  excludedKinds: DishKind[],
  kind: DishKind,
): DishKind[] =>
  excludedKinds.includes(kind)
    ? excludedKinds.filter((entry): boolean => entry !== kind)
    : [...excludedKinds, kind];

// Whether a dish passes the preferences, for the generator and the
// suggestions to filter their candidates with. Kept pure and separate from
// the composable so it is trivial to test against plain recipes.
export const isEligible = (
  preferences: PlannerPreferences,
  kind: DishKind,
  prepMinutes: number,
): boolean =>
  !preferences.excludedKinds.includes(kind) &&
  (preferences.maxPrepMinutes === undefined || prepMinutes <= preferences.maxPrepMinutes);

// One instance for the whole app, not one per caller. usePlanner() is invoked
// from several components at once (the composer, every picker, the day
// cards), and a fresh useLocalStorage() per call would only pick up another
// instance's write on the next storage event — which browsers never fire
// back into the tab that made the change. Sharing the ref is what keeps a
// preference set in one place visible everywhere else in the same tick.
let sharedPreferences: Ref<PlannerPreferences> | undefined;

const preferencesRef = (): Ref<PlannerPreferences> => {
  sharedPreferences ??= useLocalStorage<PlannerPreferences>(
    'planner:preferences',
    DEFAULT_PREFERENCES,
  );
  return sharedPreferences;
};

export const usePlannerPreferences = (): {
  preferences: Ref<PlannerPreferences>;
  toggleExcluded: (kind: DishKind) => void;
  setMaxPrepMinutes: (minutes: number | undefined) => void;
  setMaxRepeatsPerWeek: (repeats: number | undefined) => void;
  setWeeklyBudget: (euros: number | undefined) => void;
} => {
  const preferences = preferencesRef();

  return {
    preferences,
    toggleExcluded: (kind: DishKind): void => {
      preferences.value = {
        ...preferences.value,
        excludedKinds: withExclusionToggled(preferences.value.excludedKinds, kind),
      };
    },
    setMaxPrepMinutes: (minutes: number | undefined): void => {
      preferences.value = { ...preferences.value, maxPrepMinutes: minutes };
    },
    setMaxRepeatsPerWeek: (repeats: number | undefined): void => {
      preferences.value = { ...preferences.value, maxRepeatsPerWeek: repeats };
    },
    setWeeklyBudget: (euros: number | undefined): void => {
      preferences.value = {
        ...preferences.value,
        weeklyBudget: euros === undefined || euros <= 0 ? undefined : euros,
      };
    },
  };
};
