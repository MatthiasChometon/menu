import foodData from '~~/content/foods.json';
import { aisleOrder, buildFoodCatalog } from '../utils/catalog';
import type { Aisle, Food } from '../types/menu.type';

const catalog = buildFoodCatalog(foodData);

export const useFoods = (): {
  foods: Record<string, Food>;
  foodOf: (id: string) => Food | undefined;
  aisleOrder: readonly Aisle[];
  imageOf: (food: Food) => string | undefined;
} => {
  const { foodImage } = useImages();

  return {
    foods: catalog,
    foodOf: (id: string): Food | undefined => catalog[id],
    aisleOrder,
    imageOf: (food: Food): string | undefined => foodImage(food.id),
  };
};
