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

/** What a dish is built around, for filtering a long list down to a choice. */
export type DishKind = 'fish' | 'meat' | 'veggie';

/** A single dish replacement that brings a day closer to its targets. */
export type DishSwap = {
  day: DayKey;
  slot: MealSlot;
  from: Recipe | undefined;
  to: Recipe;
  /** True when the day lands inside every tolerance once applied. */
  becomesValid: boolean;
};

/** A swap offered against one named macro, with what it actually brings. */
export type MacroSwap = {
  swap: DishSwap;
  /** Signed change in that macro, in its own unit. */
  gain: number;
  becomesValid: boolean;
};

/** Which meal slots are pinned, day by day. A locked slot keeps its dish
 *  through a spread, an improve pass, or a one-click generation — the reader
 *  is telling the composer "not this one" rather than picking it again every
 *  time the week is rebuilt. */
export type LockedSlots = Partial<Record<DayKey, Partial<Record<MealSlot, true>>>>;

/** A week being worked on but not saved, held while another one is looked at. */
export type WeekDraft = {
  plan: PlannedWeek;
  chosen: Partial<Record<RecipeSlot, string[]>>;
  spreadFrom: string;
  isDirty: boolean;
  locked: LockedSlots;
};

/** How far one macro sits from its target across the week, as a percentage. */
export type MacroGap = { macro: keyof Macros; gapPercent: number };

export type SelectionBalance = {
  /** At least one group is served, so there is something to measure. */
  isReady: boolean;
  /** Every group is served: the figures now describe a whole week. */
  isComplete: boolean;
  isBalanced: boolean;
  /** Only the macros worth mentioning. Empty means nothing needs fixing. */
  gaps: MacroGap[];
  /** Every macro, for the gauge. */
  all: MacroGap[];
  /** How far this macro may stray before it counts as off, as a percentage. */
  toleranceOf: (macro: keyof Macros) => number;
};

/** What the current selection would cost, spread over the week, against the
 *  reader's own target — when they set one. */
export type BudgetStatus = {
  /** Euros the selection would come to once spread over the window. */
  cost: number;
  /** The reader's weekly target. Undefined means no budget is set: nothing to
   *  warn about, and nothing the generator steers away from either. */
  budget: number | undefined;
  isOverBudget: boolean;
};
