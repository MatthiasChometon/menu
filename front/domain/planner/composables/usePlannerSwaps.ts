import { yieldToBrowser } from './yieldToBrowser';
import type { PlannerDays } from './usePlannerDays';
import type { PlannerScoring } from './usePlannerScoring';

const { slotRecipes: SLOT_RECIPES } = usePlannerRules();

const MAX_PASSES = 4;

export type PlannerSwaps = {
  suggestFor: (day: PlannedDay) => DishSwap | undefined;
  swapsForMacro: (day: PlannedDay, macro: keyof Macros) => MacroSwap[];
  applySwap: (swap: DishSwap) => void;
  /** Applies the best single swap to every day, until each is on target or
   *  nothing improves it. The one-tap alternative to fixing days by hand.
   *  Async so the tab stays responsive while a whole week is solved. */
  improveWeek: () => Promise<void>;
  /** True while improveWeek is working, to spin its button and lock it. */
  isImproving: Ref<boolean>;
};

// Swapping one dish for another inside a day, and the passes that do it for a
// whole week.
export const usePlannerSwaps = (
  { plan, windowDays, buildDay, isLocked, touch }: PlannerDays,
  { errorOf, gapOf }: PlannerScoring,
): PlannerSwaps => {
  const { recipeOf } = useRecipes();
  const { eligibleDishesFor } = usePlannerDishes();

  const isImproving = useState<boolean>('planner:improving', (): boolean => false);

  // Every single swap the day allows, solved and scored. Ninety-six dishes and a
  // 3x3 system make this cheap enough to run on the spot, and a suggestion the
  // reader can refuse beats a red badge that only says no.
  const suggestFor = (day: PlannedDay): DishSwap | undefined => {
    if (day.isValid) return undefined;

    const slots = plan.value.days[day.key] ?? {};
    let best: DishSwap | undefined;
    let bestError = errorOf(day);

    for (const [slot, currentId] of Object.entries(slots) as [MealSlot, string][]) {
      // A pinned slot keeps its dish through this pass — the reader locked it
      // to stop it moving, and a suggestion is exactly the kind of move it
      // was locked against.
      if (isLocked(day.key, slot)) continue;

      for (const candidate of eligibleDishesFor(SLOT_RECIPES[slot])) {
        if (candidate.id === currentId) continue;

        const trial = buildDay(day.key, { ...slots, [slot]: candidate.id });
        const error = errorOf(trial);
        if (error >= bestError) continue;

        bestError = error;
        best = {
          day: day.key,
          slot,
          from: recipeOf(currentId),
          to: candidate,
          becomesValid: trial.isValid,
        };
      }
    }

    return best;
  };

  // Every swap that genuinely moves one macro, best day first. Naming the macro
  // is not the same as knowing how to fix it: nobody has a table of which dish
  // carries fibre, and being told the number is wrong without being told what
  // to do about it is the part that makes this screen feel closed.
  const swapsForMacro = (day: PlannedDay, macro: keyof Macros): MacroSwap[] => {
    const slots = plan.value.days[day.key] ?? {};
    const before = gapOf(day, macro);
    const found: (MacroSwap & { error: number })[] = [];

    for (const [slot, currentId] of Object.entries(slots) as [MealSlot, string][]) {
      if (isLocked(day.key, slot)) continue;

      for (const candidate of eligibleDishesFor(SLOT_RECIPES[slot])) {
        if (candidate.id === currentId) continue;

        const trial = buildDay(day.key, { ...slots, [slot]: candidate.id });
        // It has to close the gap on the macro that was asked about, not merely
        // tidy the day up somewhere else.
        if (Math.abs(gapOf(trial, macro)) >= Math.abs(before)) continue;

        found.push({
          error: errorOf(trial),
          gain: trial.macros[macro] - day.macros[macro],
          becomesValid: trial.isValid,
          swap: {
            day: day.key,
            slot,
            from: recipeOf(currentId),
            to: candidate,
            becomesValid: trial.isValid,
          },
        });
      }
    }

    // Ranked by the state of the whole day, so a fix for one macro is never one
    // that quietly breaks another.
    return found.sort((left, right): number => left.error - right.error).slice(0, 3);
  };

  const applySwap = (swap: DishSwap): void => {
    if (isLocked(swap.day, swap.slot)) return;

    plan.value.days[swap.day] = { ...(plan.value.days[swap.day] ?? {}), [swap.slot]: swap.to.id };
    touch();
  };

  // The one-tap "fix the whole week", where before every off day had to be
  // opened and swapped by hand. Each day is settled on its own — the solver
  // reads a day in isolation, so mending Monday never unsettles Tuesday — and a
  // few passes let a second swap finish what the first started. A day missing a
  // meal is left as it is: no swap can add one, and pretending otherwise would
  // loop.
  const improveWeek = async (): Promise<void> => {
    if (isImproving.value) return;

    isImproving.value = true;
    try {
      for (const key of windowDays.value) {
        for (let pass = 0; pass < MAX_PASSES; pass += 1) {
          const swap = suggestFor(buildDay(key));
          if (swap === undefined) break;
          applySwap(swap);
          await yieldToBrowser();
        }
      }
    } finally {
      isImproving.value = false;
    }
  };

  return { suggestFor, swapsForMacro, applySwap, improveWeek, isImproving };
};
