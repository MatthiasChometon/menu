/** What has been chosen for a week: one recipe per slot, nothing more. */
export type PlannedWeek = {
  weekOf: string;
  /** Day → slot → recipe id. A missing slot is a meal not yet decided. */
  days: Partial<Record<DayKey, Partial<Record<MealSlot, string>>>>;
};

export type PlannedMeal = {
  slot: MealSlot;
  recipe: Recipe;
  quantities: FoodQuantity[];
  macros: Macros;
};

export type MacroVerdict = {
  macro: keyof Macros;
  actual: number;
  target: number;
  /** Signed distance from the target, in percent. */
  gapPercent: number;
  isWithinTolerance: boolean;
};

export type PlannedDay = {
  key: DayKey;
  meals: PlannedMeal[];
  macros: Macros;
  verdicts: MacroVerdict[];
  /** Every macro inside its tolerance — the day is servable as it stands. */
  isValid: boolean;
  /** The dishes chosen cannot reach the targets by scaling portions alone. */
  isImpossible: boolean;
};

/** A day as the API returns it, before its enums are translated back. */
export type ApiPlannedDay = {
  day: string;
  meals: { slot: string; recipeId: string }[];
};
