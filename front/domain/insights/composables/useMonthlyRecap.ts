import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { Menu, Recipe } from '../../menu/types/menu.type';
import type { WeightEntry } from '../../weight/types/weight.type';

export type MonthlyRecap = {
  weightGainedKg: number | undefined;
  averageAdherenceRate: number;
  averageBudget: number | undefined;
  favoriteDishes: Recipe[];
  weeksCovered: number;
};

const FAVORITE_DISH_COUNT = 2;

// The month distilled to what a reader would actually tell someone: how much
// weight moved, how close to plan the weeks ran, what it cost, and what got
// eaten more than once. Every figure comes from a diary already kept for
// another reason — this composable only ever reads and aggregates.
export const useMonthlyRecap = (): {
  recapOf: (
    history: WeekAdherence[],
    entries: WeightEntry[],
    menuOf: (weekOf: string) => Menu | undefined,
    eatenCountOf: (weekOf: string, menu: Menu, recipeId: string) => number,
  ) => MonthlyRecap | undefined;
} => {
  const weightGainedOf = (entries: WeightEntry[]): number | undefined => {
    const ordered = [...entries].sort((left, right): number => left.date.localeCompare(right.date));
    const first = ordered[0];
    const last = ordered.at(-1);

    return first === undefined || last === undefined || first === last
      ? undefined
      : Math.round((last.kg - first.kg) * 10) / 10;
  };

  const favoriteDishesOf = (
    history: WeekAdherence[],
    menuOf: (weekOf: string) => Menu | undefined,
    eatenCountOf: (weekOf: string, menu: Menu, recipeId: string) => number,
  ): Recipe[] => {
    const totals = new Map<string, { recipe: Recipe; count: number }>();

    for (const week of history) {
      const menu = menuOf(week.weekOf);
      if (menu === undefined) continue;

      for (const recipe of menu.recipes) {
        const count = eatenCountOf(week.weekOf, menu, recipe.id);
        if (count === 0) continue;

        const existing = totals.get(recipe.id);
        totals.set(recipe.id, { recipe, count: (existing?.count ?? 0) + count });
      }
    }

    return [...totals.values()]
      .sort((left, right): number => right.count - left.count)
      .slice(0, FAVORITE_DISH_COUNT)
      .map((entry): Recipe => entry.recipe);
  };

  const averageBudgetOf = (
    history: WeekAdherence[],
    menuOf: (weekOf: string) => Menu | undefined,
  ): number | undefined => {
    const prices = history
      .map((week): number | undefined => menuOf(week.weekOf)?.totalPrice)
      .filter((price): price is number => price !== undefined);

    return prices.length === 0
      ? undefined
      : prices.reduce((total, price): number => total + price, 0) / prices.length;
  };

  return {
    recapOf: (history, entries, menuOf, eatenCountOf): MonthlyRecap | undefined => {
      if (history.length === 0 && entries.length === 0) return undefined;

      return {
        weightGainedKg: weightGainedOf(entries),
        averageAdherenceRate:
          history.length === 0
            ? 0
            : history.reduce((total, week): number => total + week.rate, 0) / history.length,
        averageBudget: averageBudgetOf(history, menuOf),
        favoriteDishes: favoriteDishesOf(history, menuOf, eatenCountOf),
        weeksCovered: history.length,
      };
    },
  };
};
