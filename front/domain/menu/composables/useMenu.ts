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

// Built on first use, not when the module loads: the catalogue it reads is
// filled by plugins/loadCatalog.ts, which runs after the entry script.
let builtMenus: Menu[] | undefined;

const menuList = (): Menu[] => {
  builtMenus ??= Object.values(menuModules)
    .map((module): Menu => buildMenu(module.default, catalog()))
    .sort((left, right): number => right.weekOf.localeCompare(left.weekOf));

  return builtMenus;
};

export const useMenu = (): {
  menus: Menu[];
  latestMenu: Menu | undefined;
  menuOf: (weekOf: string) => Menu | undefined;
  dayOrder: readonly DayKey[];
  mealOrder: readonly MealSlot[];
} => {
  const menus = menuList();

  return {
    menus,
    latestMenu: menus[0],
    menuOf: (weekOf: string): Menu | undefined =>
      menus.find((menu): boolean => menu.weekOf === weekOf),
    dayOrder,
    mealOrder,
  };
};
