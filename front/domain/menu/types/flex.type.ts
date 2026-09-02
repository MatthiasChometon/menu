/** Why a meal is left out of the day's macros and of the adherence tally: eaten
 *  somewhere else, or a treat that was never going to be weighed either way. */
export type MealOverrideKind = 'eatingOut' | 'cheatMeal';

/** A leftover suggestion still waiting on a decision: what yesterday's pot
 *  would put here instead of the planned dish. */
export type LeftoverSuggestion = Meal;

export type MealFlex = {
  excludedAs?: MealOverrideKind;
  /** Traded with another day, so this is not the dish originally planned for
   *  the slot. */
  isSwapped: boolean;
  /** Yesterday's pot again, standing in for what was planned here. */
  isLeftover: boolean;
  suggestedLeftover?: LeftoverSuggestion;
};

export type FlexedMeal = Meal & { flex: MealFlex };

export type FlexedDay = {
  key: DayKey;
  meals: FlexedMeal[];
  macros: Macros;
};
