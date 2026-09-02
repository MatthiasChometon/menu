import type { Day, Food, FoodQuantity, Menu, MicroKey } from '../../menu/types/menu.type';

export type MicroGap = {
  key: MicroKey;
  averagePercentOfTarget: number;
  suggestion: Food | undefined;
};

const MICRO_KEYS: readonly MicroKey[] = [
  'omega3',
  'vitaminD',
  'iron',
  'zinc',
  'magnesium',
  'calcium',
  'potassium',
  'vitaminC',
];

// Below this, a day is not merely light on a nutrient — the week as a whole
// keeps missing it, which is worth naming rather than leaving buried in eight
// separate daily numbers nobody compares.
const LOW_THRESHOLD_PERCENT = 60;

// The one micronutrient the week falls short on most days in a row, paired
// with a real food that would close most of the gap on its own — never a
// supplement, and never a dose to take, just something to eat more of.
export const useMicroGap = (): {
  gapOf: (menu: Menu, foods: Food[]) => MicroGap | undefined;
} => {
  const { microsOfQuantities, dailyTargets } = useMicros();

  const percentOfTargetOf = (day: Day, key: MicroKey): number => {
    const quantities = day.meals.flatMap((meal): FoodQuantity[] => meal.quantities);
    const target = dailyTargets[key];

    return target === 0 ? 0 : (microsOfQuantities(quantities)[key] / target) * 100;
  };

  const averagePercentOf = (days: Day[], key: MicroKey): number =>
    days.reduce((total, day): number => total + percentOfTargetOf(day, key), 0) / days.length;

  const bestFoodForOf = (foods: Food[], key: MicroKey): Food | undefined =>
    foods
      .filter((food): boolean => food.aisle !== 'supplement')
      .sort((left, right): number => right.micros[key] - left.micros[key])[0];

  return {
    gapOf: (menu: Menu, foods: Food[]): MicroGap | undefined => {
      if (menu.days.length === 0) return undefined;

      const worst = MICRO_KEYS.map((key): { key: MicroKey; averagePercentOfTarget: number } => ({
        key,
        averagePercentOfTarget: averagePercentOf(menu.days, key),
      })).sort(
        (left, right): number => left.averagePercentOfTarget - right.averagePercentOfTarget,
      )[0];

      if (worst === undefined || worst.averagePercentOfTarget >= LOW_THRESHOLD_PERCENT)
        return undefined;

      return { ...worst, suggestion: bestFoodForOf(foods, worst.key) };
    },
  };
};
