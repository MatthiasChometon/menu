import type { DayKey, MealSlot, Menu, MenuCatalog, RawMenu } from '../types/menu.type';

const menuModules = import.meta.glob<{ default: RawMenu }>('../content/menus/*.json', {
  eager: true,
});

const { buildMenu, dayOrder, mealOrder } = useMenuBuilder();

const catalog = (): MenuCatalog => {
  const { foodOf } = useFoods();
  const { recipeOf } = useRecipes();
  const { freshOf } = useSeasonings();

  return { foodOf, recipeOf, freshOf };
};

const menuList: Menu[] = Object.values(menuModules)
  .map((module): Menu => buildMenu(module.default, catalog()))
  .sort((left, right): number => right.weekOf.localeCompare(left.weekOf));

export const useMenu = (): {
  menus: Menu[];
  latestMenu: Menu | undefined;
  menuOf: (weekOf: string) => Menu | undefined;
  dayOrder: readonly DayKey[];
  mealOrder: readonly MealSlot[];
} => ({
  menus: menuList,
  latestMenu: menuList[0],
  menuOf: (weekOf: string): Menu | undefined =>
    menuList.find((menu): boolean => menu.weekOf === weekOf),
  dayOrder,
  mealOrder,
});
