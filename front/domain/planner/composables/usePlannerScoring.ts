import { slotsOnDay } from './usePlannerSpread';
import type { PlannerDays } from './usePlannerDays';
import type { PlannerSelection } from './usePlannerSelection';

const { macroOrder: MACRO_ORDER, groupOrder: GROUP_ORDER, balanceTolerance } = usePlannerRules();

// Protein counts double. Weighing every macro alike lets a swap trade protein
// away to tidy up fat and carbohydrate, which on a bulk is the one trade not
// worth making: the rest of the plan is built around the protein figure.
const MACRO_WEIGHT: Partial<Record<keyof Macros, number>> = { protein: 2, kcal: 1.5 };

// On the same percentage scale as a macro's gap, so it weighs into a
// candidate's score without needing its own units. A budget nobody set
// penalises nothing: the generator only leans on cost once the reader has
// said what it should be. A soft lean, not a wall — a dish that fixes a
// real macro shortfall can still outweigh a modest overspend.
const BUDGET_WEIGHT = 1;

export type PlannerScoring = {
  /** How far a day sits from its targets, only to rank candidates: smaller is
   *  better, the scale means nothing. */
  errorOf: (day: PlannedDay) => number;
  gapOf: (day: PlannedDay, macro: keyof Macros) => number;
  /** How good a dish would be to add to a group, lower being better: the week's
   *  error with it, plus what repeating a recent week would cost. */
  scoreOf: (group: RecipeSlot, recipeId: string) => number;
  selectionBalance: ComputedRef<SelectionBalance>;
  /** What the current picks would cost, spread over the week, against the
   *  reader's own weekly budget when one is set. */
  budgetStatus: ComputedRef<BudgetStatus>;
  /** The macro this dish would help most with, when one is short. */
  fillsIn: (group: RecipeSlot, recipeId: string) => keyof Macros | undefined;
  recommendedIn: (group: RecipeSlot) => Set<string>;
};

// How a day, a dish or a whole selection measures against the targets and the
// budget — everything that answers "is this better" without changing the plan.
export const usePlannerScoring = (
  { windowDays, buildDay, tolerance }: PlannerDays,
  { chosenDishes, isGroupComplete }: PlannerSelection,
): PlannerScoring => {
  const { priceOfQuantities } = useNutrition();
  const { preferences } = usePlannerPreferences();
  const { eligibleDishesFor } = usePlannerDishes();
  const { week: plannerWeek } = usePlannerWeek();
  const { repeatPenalty } = usePlannerHistory();

  // What a day's meals actually cost, from the same food prices the shopping
  // list is built from — never a separate estimate of it.
  const costOf = (day: PlannedDay): number =>
    priceOfQuantities(day.meals.flatMap((meal): FoodQuantity[] => meal.quantities));

  const budgetOveragePercent = (cost: number): number => {
    const budget = preferences.value.weeklyBudget;
    if (budget === undefined) return 0;

    return Math.max(0, ((cost - budget) / budget) * 100);
  };

  // Gaps already inside tolerance are discounted rather than ignored, so a swap
  // still prefers the middle of the range to its edge.
  const errorOf = (day: PlannedDay): number =>
    day.verdicts.reduce(
      (total, verdict): number =>
        total +
        (Math.abs(verdict.gapPercent) * (MACRO_WEIGHT[verdict.macro] ?? 1)) /
          (verdict.isWithinTolerance ? 4 : 1),
      day.isImpossible ? 100 : 0,
    );

  const gapOf = (day: PlannedDay, macro: keyof Macros): number =>
    day.verdicts.find((verdict): boolean => verdict.macro === macro)?.gapPercent ?? 0;

  // What a selection would look like spread over the window, without touching
  // the plan itself — the same preview the balance and the budget are read
  // from, and what a candidate dish is tried against before it is chosen.
  const simulatedWeekFor = (selection: Partial<Record<RecipeSlot, string[]>>): PlannedDay[] =>
    windowDays.value.map((day, index): PlannedDay => buildDay(day, slotsOnDay(selection, index)));

  // The current picks, previewed the same way — what the balance panel and the
  // budget read while the reader is still choosing, before anything is spread.
  const simulatedWeek = computed((): PlannedDay[] => simulatedWeekFor(chosenDishes.value));

  const withDish = (
    group: RecipeSlot,
    recipeId: string,
  ): Partial<Record<RecipeSlot, string[]>> => ({
    ...chosenDishes.value,
    [group]: [...(chosenDishes.value[group] ?? []), recipeId],
  });

  // What the week would come to if this dish were added. A dish cannot be judged
  // on its own macros: it lands on several days beside whatever else was picked,
  // and it is that whole week the targets — and the budget, when one is set —
  // are read against.
  const weekErrorWith = (group: RecipeSlot, recipeId: string): number => {
    const simulated = simulatedWeekFor(withDish(group, recipeId));

    const macroError = simulated.reduce((total, day): number => total + errorOf(day), 0);
    const cost = simulated.reduce((total, day): number => total + costOf(day), 0);

    return macroError + budgetOveragePercent(cost) * BUDGET_WEIGHT;
  };

  // Not a hard ban — a dish eaten in a recent composed week is still allowed
  // if nothing else closes the week's gaps, but it should lose to any dish
  // that has not shown up lately. usePlannerHistory works out how much,
  // tapering off the further back the window reaches — a multi-week rotation
  // rather than a flat "used or not" cutoff.
  const scoreOf = (group: RecipeSlot, recipeId: string): number =>
    weekErrorWith(group, recipeId) + repeatPenalty(plannerWeek.value, recipeId);

  // What the current picks would give, spread over a week, without adding
  // anything. Answers "what is missing" while there is still something to do
  // about it — the day view only ever says it once the choosing is over.
  const selectionBalance = computed((): SelectionBalance => {
    // Always measured, from the very first card. Appearing halfway through
    // moved the grid a hundred pixels between two taps, and the next dish was
    // no longer under the finger.
    const isComplete = GROUP_ORDER.every((group): boolean => isGroupComplete(group));

    const simulated = simulatedWeek.value;

    const gaps = MACRO_ORDER.map((macro): MacroGap => {
      const percents = simulated.map((day): number => gapOf(day, macro));

      return {
        macro,
        // Averaged over the week rather than taken at its worst: a single day
        // off is what the spread is for, and calling that a shortfall would
        // send the reader picking dishes to fix a problem they do not have.
        gapPercent: percents.reduce((total, value): number => total + value, 0) / percents.length,
      };
    });

    return {
      isReady: true,
      isComplete,
      // A week still missing meals is not balanced, it is unfinished — saying
      // otherwise would invite stopping halfway.
      isBalanced: isComplete && simulated.every((day): boolean => day.isValid),
      gaps: gaps.filter((gap): boolean => Math.abs(gap.gapPercent) > balanceTolerance),
      // Every macro, in order, whether or not it needs mentioning: a gauge has
      // to show somebody approaching the target, not only overshooting it.
      all: gaps,
      toleranceOf: (macro: keyof Macros): number =>
        tolerance.value[macro] ?? tolerance.value.default,
    };
  });

  // What the current picks would cost, spread over the week — read the same
  // way as the balance above, so it moves with every dish tapped rather than
  // only once the week is spread.
  const budgetStatus = computed((): BudgetStatus => {
    const cost = simulatedWeek.value.reduce((total, day): number => total + costOf(day), 0);
    const budget = preferences.value.weeklyBudget;

    return { cost, budget, isOverBudget: budget !== undefined && cost > budget };
  });

  // Which macro a dish would help most with, among those currently short.
  // Named after the dish, never after the reader: "riche en protéines" is a
  // fact about food, "+18 %" is a score to game.
  const fillsIn = (group: RecipeSlot, recipeId: string): keyof Macros | undefined => {
    const short = selectionBalance.value.all
      .filter((gap): boolean => gap.gapPercent < -selectionBalance.value.toleranceOf(gap.macro))
      .sort((left, right): number => left.gapPercent - right.gapPercent);

    // Only worth saying when the dish genuinely closes the widest gap.
    const worst = short[0];
    if (worst === undefined) return undefined;

    const withThisDish = simulatedWeekFor(withDish(group, recipeId));
    const after =
      withThisDish.reduce((total, day): number => total + gapOf(day, worst.macro), 0) /
      withThisDish.length;

    return after > worst.gapPercent ? worst.macro : undefined;
  };

  // The three dishes that would leave the week closest to its targets. Marking
  // them steers the choice without taking it away — and unlike most such nudges,
  // what is being recommended here is simply what is true. Ranking stays fair
  // even on the first step, where no group is filled yet: every candidate is
  // scored against the same incomplete week.
  const recommendedIn = (group: RecipeSlot): Set<string> => {
    const ranked = eligibleDishesFor(group)
      .filter((recipe): boolean => !(chosenDishes.value[group] ?? []).includes(recipe.id))
      .map((recipe): { id: string; error: number } => ({
        id: recipe.id,
        error: scoreOf(group, recipe.id),
      }))
      .sort((left, right): number => left.error - right.error);

    return new Set(ranked.slice(0, 3).map((entry): string => entry.id));
  };

  return { errorOf, gapOf, scoreOf, selectionBalance, budgetStatus, fillsIn, recommendedIn };
};
