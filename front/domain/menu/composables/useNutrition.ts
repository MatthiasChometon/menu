import { macroKeys, macrosOfQuantities, priceOfQuantities, sumMacros } from '../utils/nutrition';
import type { FoodQuantity, Macros } from '../types/menu.type';

export const useNutrition = (): {
  macrosOfQuantities: (quantities: FoodQuantity[]) => Macros;
  sumMacros: (list: Macros[]) => Macros;
  priceOfQuantities: (quantities: FoodQuantity[]) => number;
  macroKeys: readonly (keyof Macros)[];
} => ({
  macrosOfQuantities,
  sumMacros,
  priceOfQuantities,
  macroKeys,
});
