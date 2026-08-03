const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

const macrosOfQuantities = (quantities: FoodQuantity[]): Macros => {
  const totals = quantities.reduce(
    (accumulator, { food, grams }): Macros => ({
      kcal: 0,
      protein: accumulator.protein + (food.protein * grams) / 100,
      fat: accumulator.fat + (food.fat * grams) / 100,
      carbs: accumulator.carbs + (food.carbs * grams) / 100,
      fiber: accumulator.fiber + (food.fiber * grams) / 100,
    }),
    EMPTY_MACROS,
  );

  // Energy is recomputed from the macros (4/9/4) rather than summed from the
  // food tables, so a day total always matches the macro targets it is compared to.
  return { ...totals, kcal: totals.protein * 4 + totals.fat * 9 + totals.carbs * 4 };
};

const sumMacros = (list: Macros[]): Macros =>
  list.reduce(
    (accumulator, macros): Macros => ({
      kcal: accumulator.kcal + macros.kcal,
      protein: accumulator.protein + macros.protein,
      fat: accumulator.fat + macros.fat,
      carbs: accumulator.carbs + macros.carbs,
      fiber: accumulator.fiber + macros.fiber,
    }),
    EMPTY_MACROS,
  );

const priceOfQuantities = (quantities: FoodQuantity[]): number =>
  quantities.reduce(
    (accumulator, { food, grams }): number => accumulator + (food.pricePerKg * grams) / 1000,
    0,
  );

export const useNutrition = (): {
  macrosOfQuantities: (quantities: FoodQuantity[]) => Macros;
  sumMacros: (list: Macros[]) => Macros;
  priceOfQuantities: (quantities: FoodQuantity[]) => number;
  macroKeys: readonly (keyof Macros)[];
} => ({
  macrosOfQuantities,
  sumMacros,
  priceOfQuantities,
  macroKeys: ['kcal', 'protein', 'fat', 'carbs', 'fiber'],
});
