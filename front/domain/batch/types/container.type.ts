// One box, one meal: what it holds, when it is eaten, and the last day it is
// safe to serve. Derived straight from the menu — the plan already says which
// dish is eaten when, so the label never has to be entered by hand.
export type ContainerLabel = {
  id: string;
  recipe: Recipe;
  day: DayKey;
  slot: MealSlot;
  /** ISO date (yyyy-mm-dd) of the day this box is opened. */
  bestBefore: string;
};

export type ContainerGroup = {
  recipe: Recipe;
  labels: ContainerLabel[];
};
