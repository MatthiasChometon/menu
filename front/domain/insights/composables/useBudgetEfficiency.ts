import type { Macros, Menu, Recipe } from '../../menu/types/menu.type';

export type RecipeValue = { recipe: Recipe; proteinPerEuro: number };
export type BudgetHistoryPoint = { weekOf: string; totalPrice: number };

// What a week's protein actually cost, and which of its dishes gave the most
// of it per euro spent — read from the same shopping list the week already
// prices, never a second estimate of it.
export const useBudgetEfficiency = (): {
  costPer100gProteinOf: (menu: Menu) => number | undefined;
  bestValueDishOf: (menu: Menu) => RecipeValue | undefined;
  historyOf: (menus: Menu[]) => BudgetHistoryPoint[];
} => {
  const { sumMacros, priceOfQuantities } = useNutrition();

  type RecipeSpend = { recipe: Recipe; proteinGrams: number; cost: number };

  const spendByRecipeOf = (menu: Menu): RecipeSpend[] => {
    const totals = new Map<string, RecipeSpend>();

    for (const day of menu.days) {
      for (const meal of day.meals) {
        const existing = totals.get(meal.recipe.id) ?? {
          recipe: meal.recipe,
          proteinGrams: 0,
          cost: 0,
        };
        totals.set(meal.recipe.id, {
          recipe: meal.recipe,
          proteinGrams: existing.proteinGrams + meal.macros.protein,
          cost: existing.cost + priceOfQuantities(meal.quantities),
        });
      }
    }

    return [...totals.values()];
  };

  return {
    costPer100gProteinOf: (menu: Menu): number | undefined => {
      const weekProtein = sumMacros(menu.days.map((day): Macros => day.macros)).protein;
      return weekProtein === 0 ? undefined : (menu.totalPrice / weekProtein) * 100;
    },
    bestValueDishOf: (menu: Menu): RecipeValue | undefined =>
      spendByRecipeOf(menu)
        .filter((spend): boolean => spend.cost > 0)
        .map((spend): RecipeValue => ({
          recipe: spend.recipe,
          proteinPerEuro: spend.proteinGrams / spend.cost,
        }))
        .sort((left, right): number => right.proteinPerEuro - left.proteinPerEuro)[0],
    historyOf: (menus: Menu[]): BudgetHistoryPoint[] =>
      [...menus]
        .sort((left, right): number => left.weekOf.localeCompare(right.weekOf))
        .map((menu): BudgetHistoryPoint => ({ weekOf: menu.weekOf, totalPrice: menu.totalPrice })),
  };
};
