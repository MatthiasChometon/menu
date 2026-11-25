type GroupLimits = { min: number; max: number };

type PlannerRules = {
  macroOrder: readonly (keyof Macros)[];
  /** Which pool fills a meal slot. */
  slotRecipes: Record<MealSlot, RecipeSlot>;
  /** Which meals a chosen dish of a group fills. */
  groupSlots: Record<RecipeSlot, MealSlot[]>;
  /** The groups the composer walks through on its own. */
  groupOrder: readonly RecipeSlot[];
  /** One screen per step, each one or more groups. */
  steps: readonly (readonly RecipeSlot[])[];
  /** How many dishes a group needs for the week to hold together, and how many
   *  keep it cookable. */
  limits: Record<RecipeSlot, GroupLimits>;
  /** The tolerance used when the latest menu does not carry its own. */
  defaultTolerance: MacroTolerance;
  /** Below this gap the spread absorbs the difference, and saying anything would
   *  only send somebody hunting for a dish to fix a gap they do not have. */
  balanceTolerance: number;
};

// Which pool fills a meal slot. Lunch and dinner share the savoury dishes: full
// portion at noon, reduced one in the evening. The two afternoon en-cas draw from
// the same merged pool: post-training and the snack were folded into one choice,
// so a dish tagged either way can land in either slot.
const SLOT_RECIPES: Record<MealSlot, RecipeSlot> = {
  breakfast: 'breakfast',
  postWorkout: 'snack',
  lunch: 'main',
  snack: 'snack',
  dinner: 'main',
};

// The snack group carries both afternoon en-cas from one merged list.
const GROUP_SLOTS: Record<RecipeSlot, MealSlot[]> = {
  main: ['lunch', 'dinner'],
  breakfast: ['breakfast'],
  postWorkout: ['postWorkout'],
  snack: ['postWorkout', 'snack'],
};

// postWorkout is a slot a day still has, but never a group the composer walks
// through on its own: its dishes are chosen inside the snack group.
const GROUP_ORDER: readonly RecipeSlot[] = ['main', 'breakfast', 'snack'];

// One screen per meal in the composer. The solver never sees these; it works off
// GROUP_ORDER.
const STEPS: readonly (readonly RecipeSlot[])[] = [['main'], ['breakfast'], ['snack']];

// The floor on the savoury dishes is two, because lunch and dinner must differ on
// the same day. Everywhere else it is one, but a real one: a day missing a meal
// forces the remaining ones to be scaled beyond what anyone eats, which is when
// the solver clamps and the day falls off target.
//
// The ceilings keep the week cookable: fourteen savoury servings split across
// more than four dishes means cooking single portions, which defeats batch
// cooking.
const GROUP_LIMITS: Record<RecipeSlot, GroupLimits> = {
  main: { min: 2, max: 4 },
  breakfast: { min: 1, max: 3 },
  postWorkout: { min: 1, max: 3 },
  // Two, because the group fills two slots: a morning collation and an
  // afternoon goûter.
  snack: { min: 2, max: 4 },
};

const RULES: PlannerRules = {
  macroOrder: ['kcal', 'protein', 'fat', 'carbs', 'fiber'],
  slotRecipes: SLOT_RECIPES,
  groupSlots: GROUP_SLOTS,
  groupOrder: GROUP_ORDER,
  steps: STEPS,
  limits: GROUP_LIMITS,
  defaultTolerance: { default: 5, kcal: 4, fiber: 12 },
  balanceTolerance: 5,
};

// What the composer is built on: which dishes fill which meals, how many of each
// a week needs, and the screens it walks through. Constants, kept apart from the
// state that moves.
export const usePlannerRules = (): PlannerRules => RULES;
