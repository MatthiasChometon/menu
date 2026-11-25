import { yieldToBrowser } from './yieldToBrowser';
import type { PlannerDays } from './usePlannerDays';
import type { PlannerScoring } from './usePlannerScoring';
import type { PlannerSelection } from './usePlannerSelection';
import type { PlannerSpread } from './usePlannerSpread';
import type { PlannerSwaps } from './usePlannerSwaps';

const {
  groupSlots: GROUP_SLOTS,
  groupOrder: GROUP_ORDER,
  limits: GROUP_LIMITS,
} = usePlannerRules();

export type PlannerGeneration = {
  /** Fills every group to its minimum with the dishes that fit the targets best. */
  completeSelection: () => void;
  /** Fills every group for variety and the targets, places the result on the
   *  days, then mends whatever is still off — the whole composer in one tap.
   *  Async and yielding, like improveWeek, so a full week never freezes the
   *  tab. */
  generateWeek: () => Promise<void>;
  /** True while generateWeek is working. */
  isGenerating: Ref<boolean>;
};

// Composing a week without the reader picking: fill each group, spread it, then
// mend what is still off.
export const usePlannerGeneration = (
  { windowDays }: PlannerDays,
  { chosenDishes, dishesFor }: PlannerSelection,
  { scoreOf }: PlannerScoring,
  { spread }: PlannerSpread,
  { improveWeek, isImproving }: PlannerSwaps,
): PlannerGeneration => {
  const { preferences } = usePlannerPreferences();
  const { eligibleDishesFor } = usePlannerDishes();

  const isGenerating = useState<boolean>('planner:generating', (): boolean => false);

  // Fills one group up to a target count, one dish at a time so each choice is
  // made knowing the last, from the pool the preferences and the recent weeks
  // leave standing.
  const fillGroupTo = (group: RecipeSlot, target: number): void => {
    while ((chosenDishes.value[group] ?? []).length < target) {
      const chosenIds = chosenDishes.value[group] ?? [];
      const unchosen = (recipe: Recipe): boolean => !chosenIds.includes(recipe.id);
      const eligible = eligibleDishesFor(group).filter(unchosen);
      // Preferences that rule out everything left would otherwise stall the
      // week half-built; filling it in full beats obeying a preference nobody
      // left standing can satisfy.
      const candidates = eligible.length > 0 ? eligible : dishesFor(group).filter(unchosen);
      if (candidates.length === 0) break;

      // Scored once per dish, not once per comparison: weekErrorWith builds
      // a whole week each time, and calling it twice per candidate froze the
      // page outright.
      const best = candidates
        .map((recipe): { id: string; error: number } => ({
          id: recipe.id,
          error: scoreOf(group, recipe.id),
        }))
        .reduce((chosen, entry): { id: string; error: number } =>
          entry.error < chosen.error ? entry : chosen,
        );

      chosenDishes.value = {
        ...chosenDishes.value,
        [group]: [...(chosenDishes.value[group] ?? []), best.id],
      };
    }
  };

  // Fills every group up to its minimum with whichever dish leaves the week
  // closest to the targets. A correct starting point beats a blank page — and
  // everything it puts in can be swapped afterwards, which is why it fills the
  // minimum rather than the maximum: it opens the door, it does not decide the
  // week.
  const completeSelection = (): void => {
    for (const group of GROUP_ORDER) fillGroupTo(group, GROUP_LIMITS[group].min);
  };

  // How many distinct dishes a group needs so none of them repeats more than
  // the preference allows, once spread evenly over the window.
  const requiredCountFor = (group: RecipeSlot): number => {
    const maxRepeats = preferences.value.maxRepeatsPerWeek;
    if (maxRepeats === undefined || maxRepeats <= 0) return GROUP_LIMITS[group].min;

    const totalServings = GROUP_SLOTS[group].length * windowDays.value.length;
    const needed = Math.ceil(totalServings / maxRepeats);

    return Math.min(GROUP_LIMITS[group].max, Math.max(GROUP_LIMITS[group].min, needed));
  };

  // The one-tap "compose a whole week": fills every group for variety and the
  // targets, places the result on the days, then mends whatever is still off —
  // the same three steps as doing it by hand, run back to back. Locked slots,
  // the preferences and the last two composed weeks steer it exactly as they
  // steer a manual pick. Async and yielding between passes, like improveWeek,
  // so solving a whole week never freezes the tab.
  const generateWeek = async (): Promise<void> => {
    if (isGenerating.value || isImproving.value) return;

    isGenerating.value = true;
    try {
      for (const group of GROUP_ORDER) {
        fillGroupTo(group, requiredCountFor(group));
        await yieldToBrowser();
      }

      spread();
      await yieldToBrowser();
      await improveWeek();
    } finally {
      isGenerating.value = false;
    }
  };

  return { completeSelection, generateWeek, isGenerating };
};
