// Where a dish of the week stands. A menu says what to eat; this says what has
// actually been done about it, which is the part the fridge knows and the plan
// does not.
export type DishStatus =
  /** Still to cook. */
  | 'todo'
  /** Cooked: its portions are in the fridge. */
  | 'done'
  /** Deliberately left out of this cooking session. */
  | 'skipped';

export type DishProgress = {
  recipe: Recipe;
  status: DishStatus;
  /** Portions the week asks for. */
  servings: number;
  /** Portions cooked but not yet eaten. Zero until the dish is cooked. */
  left: number;
};
