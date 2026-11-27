import type { PlannerDays } from './usePlannerDays';
import type { PlannerGeneration } from './usePlannerGeneration';
import type { PlannerSaving } from './usePlannerSaving';
import type { PlannerScoring } from './usePlannerScoring';
import type { PlannerSelection } from './usePlannerSelection';
import type { PlannerSpread } from './usePlannerSpread';
import type { PlannerSwaps } from './usePlannerSwaps';

type PlannerDishes = ReturnType<typeof usePlannerDishes>;

export type Planner = Pick<
  PlannerDays,
  | 'plan'
  | 'isDirty'
  | 'targets'
  | 'days'
  | 'isComplete'
  | 'isValid'
  | 'isLocked'
  | 'toggleLock'
  | 'chosen'
  | 'choose'
  | 'copyDay'
  | 'clearDay'
> &
  Pick<PlannerDishes, 'kindOf' | 'isQuick'> &
  PlannerSelection &
  Pick<
    PlannerScoring,
    'recommendedIn' | 'recommendedInSlices' | 'fillsIn' | 'selectionBalance' | 'budgetStatus'
  > &
  PlannerSwaps &
  PlannerGeneration &
  PlannerSpread &
  PlannerSaving;

// The planner as the composer page sees it. Each concern lives in its own
// composable; this one only wires them together and keeps the one surface the
// callers have always used.
export const usePlanner = (): Planner => {
  const days = usePlannerDays();
  const selection = usePlannerSelection(days.touch);
  const scoring = usePlannerScoring(days, selection);
  const spread = usePlannerSpread(days, selection);
  const swaps = usePlannerSwaps(days, scoring);
  const generation = usePlannerGeneration(days, selection, scoring, spread, swaps);
  const saving = usePlannerSaving(days, selection, spread);
  const { kindOf, isQuick } = usePlannerDishes();

  return {
    plan: days.plan,
    isDirty: days.isDirty,
    targets: days.targets,
    days: days.days,
    isComplete: days.isComplete,
    isValid: days.isValid,
    isLocked: days.isLocked,
    toggleLock: days.toggleLock,
    chosen: days.chosen,
    choose: days.choose,
    copyDay: days.copyDay,
    clearDay: days.clearDay,
    kindOf,
    isQuick,
    ...selection,
    recommendedIn: scoring.recommendedIn,
    recommendedInSlices: scoring.recommendedInSlices,
    fillsIn: scoring.fillsIn,
    selectionBalance: scoring.selectionBalance,
    budgetStatus: scoring.budgetStatus,
    ...swaps,
    ...generation,
    ...spread,
    ...saving,
  };
};
