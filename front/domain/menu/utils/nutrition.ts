import type { FoodQuantity, Macros } from '../types/menu.type';

const EMPTY: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

export const macroKeys: readonly (keyof Macros)[] = ['kcal', 'protein', 'fat', 'carbs', 'fiber'];

export const macrosOfQuantities = (quantities: FoodQuantity[]): Macros => {
  const totals = quantities.reduce(
    (accumulator, { food, grams }): Macros => ({
      kcal: 0,
      protein: accumulator.protein + (food.protein * grams) / 100,
      fat: accumulator.fat + (food.fat * grams) / 100,
      carbs: accumulator.carbs + (food.carbs * grams) / 100,
      fiber: accumulator.fiber + (food.fiber * grams) / 100,
    }),
    EMPTY,
  );

  // Energy comes from the macros (4/9/4), never summed from the food tables, so a
  // total always matches the targets it is compared against.
  return { ...totals, kcal: totals.protein * 4 + totals.fat * 9 + totals.carbs * 4 };
};

export const sumMacros = (list: Macros[]): Macros =>
  list.reduce(
    (accumulator, macros): Macros => ({
      kcal: accumulator.kcal + macros.kcal,
      protein: accumulator.protein + macros.protein,
      fat: accumulator.fat + macros.fat,
      carbs: accumulator.carbs + macros.carbs,
      fiber: accumulator.fiber + macros.fiber,
    }),
    EMPTY,
  );

export const priceOfQuantities = (quantities: FoodQuantity[]): number =>
  quantities.reduce((total, { food, grams }): number => total + (food.pricePerKg * grams) / 1000, 0);
