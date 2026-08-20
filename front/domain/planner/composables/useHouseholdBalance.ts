import { MACRO_ORDER } from './usePlanner';
import type { MacroGap } from './usePlanner';
import type { Eater } from '../../profile/composables/useHouseholdQuantities';

// Wider than the composer's own five percent: portions are rounded to the
// gramme for each person, and a household of four accumulates that rounding.
// Flagging it would blame the reader for arithmetic they cannot change.
const HOUSEHOLD_TOLERANCE = 8;

export type EaterVerdict = {
  eater: Eater;
  isBalanced: boolean;
  /** The macros worth naming. Empty when the week works out for this person. */
  gaps: MacroGap[];
};

// Whether the week works out for everybody it will be served to, not only for
// whoever composed it.
//
// Portions are scaled per person, so most of the time it does: a smaller eater
// simply gets less of everything. It stops being true when someone's targets
// are shaped differently — more protein for the same calories — because no
// amount of scaling the same dishes can serve two different ratios at once.
// That is the case worth catching, and the only reason this exists.
export const useHouseholdBalance = (): {
  verdictsFor: (days: PlannedDay[], eaters: Eater[], reference: Macros) => EaterVerdict[];
} => {
  const { scaleQuantity } = useScaledQuantities();
  const { sumMacros, macrosOfQuantities } = useNutrition();

  const macrosForEater = (day: PlannedDay, reference: Macros, eater: Eater): Macros =>
    sumMacros(
      day.meals.map((meal): Macros => {
        const scaled = meal.quantities.map((quantity): FoodQuantity => ({
          food: quantity.food,
          grams: scaleQuantity(
            quantity.grams,
            { kcal: quantity.food.kcal, protein: quantity.food.protein },
            reference,
            eater.targets,
          ),
        }));

        return macrosOfQuantities(scaled);
      }),
    );

  return {
    verdictsFor: (days: PlannedDay[], eaters: Eater[], reference: Macros): EaterVerdict[] =>
      eaters.map((eater): EaterVerdict => {
        const gaps = MACRO_ORDER.map((macro): MacroGap => {
          const percents = days.map((day): number => {
            const target = eater.targets[macro];
            if (target === 0) return 0;

            return ((macrosForEater(day, reference, eater)[macro] - target) / target) * 100;
          });

          return {
            macro,
            gapPercent:
              percents.reduce((total, value): number => total + value, 0) / (percents.length || 1),
          };
        });

        const named = gaps.filter((gap): boolean => Math.abs(gap.gapPercent) > HOUSEHOLD_TOLERANCE);

        return { eater, isBalanced: named.length === 0, gaps: named };
      }),
  };
};
