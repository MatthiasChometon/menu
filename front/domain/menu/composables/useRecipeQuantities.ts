import type { FoodQuantity, Recipe } from '../types/menu.type';

type UseRecipeQuantities = {
  /** A recipe's ingredients at the grammes it is written with. An ingredient the
   *  catalogue no longer knows is left out rather than failing the whole dish. */
  quantitiesOf: (recipe: Recipe) => FoodQuantity[];
};

export const useRecipeQuantities = (): UseRecipeQuantities => {
  const { foodOf } = useFoods();

  const quantitiesOf = (recipe: Recipe): FoodQuantity[] =>
    Object.entries(recipe.ingredients)
      .map(([id, grams]): FoodQuantity | undefined => {
        const food = foodOf(id);
        return food === undefined ? undefined : { food, grams };
      })
      .filter((quantity): quantity is FoodQuantity => quantity !== undefined);

  return { quantitiesOf };
};
