import type { Aisle, Food } from '../types/menu.type';

// Filled by plugins/loadCatalog.ts, from its own chunk, before the app mounts:
// the entry script does not carry the JSON. Reactive so a signed-in reader's
// own foods can join the site's, once they load: mergeCustomCatalog.client.ts
// is the only other thing that ever writes to it, and only in the browser.
export const foodCatalog = reactive<Record<string, Food>>({});

export const useFoods = (): {
  foods: Record<string, Food>;
  foodOf: (id: string) => Food | undefined;
  aisleOrder: readonly Aisle[];
  imageOf: (food: Food) => string | undefined;
} => {
  const { foodImage } = useImages();
  const { aisleOrder } = useCatalogBuilder();

  return {
    foods: foodCatalog,
    foodOf: (id: string): Food | undefined => foodCatalog[id],
    aisleOrder,
    imageOf: (food: Food): string | undefined => foodImage(food.id),
  };
};
