import { gramsEquivalentTo, substitutesFor } from '../utils/substitute';
import type { Food } from '../types/menu.type';

export const useFoodSubstitutes = (): {
  substitutesFor: (food: Food) => Food[];
  gramsEquivalentTo: (original: Food, grams: number, substitute: Food) => number;
} => {
  const { foods } = useFoods();

  return {
    substitutesFor: (food: Food): Food[] => substitutesFor(food, Object.values(foods)),
    gramsEquivalentTo,
  };
};
