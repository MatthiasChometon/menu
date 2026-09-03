import foodData from '~~/domain/menu/content/foods.json';
import { aisleOrder, buildFoodCatalog } from '../utils/catalog';
import type { Aisle, Food } from '../types/menu.type';

// Reactive so a signed-in reader's own foods can join the site's, once they
// load: mergeCustomCatalog.client.ts is the only thing that ever writes to it,
// and only in the browser. The prerender and an anonymous visit never touch
// that plugin, so both keep seeing this exact static catalogue.
export const foodCatalog = reactive<Record<string, Food>>({ ...buildFoodCatalog(foodData) });

export const useFoods = (): {
  foods: Record<string, Food>;
  foodOf: (id: string) => Food | undefined;
  aisleOrder: readonly Aisle[];
  imageOf: (food: Food) => string | undefined;
} => {
  const { foodImage } = useImages();

  return {
    foods: foodCatalog,
    foodOf: (id: string): Food | undefined => foodCatalog[id],
    aisleOrder,
    imageOf: (food: Food): string | undefined => foodImage(food.id),
  };
};
