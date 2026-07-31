type RawMeal = { recipe: string; foods: Record<string, number> };

type RawMenu = {
  weekOf: string;
  targets: Macros & { tolerancePct?: MacroTolerance };
  days: Record<string, Record<string, RawMeal>>;
};

const DAY_ORDER: readonly DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const MEAL_ORDER: readonly MealSlot[] = ['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner'];

const menuModules = import.meta.glob<{ default: RawMenu }>('../../../content/menus/*.json', {
  eager: true,
});

const toQuantities = (foods: Record<string, number>): FoodQuantity[] => {
  const { foodOf } = useFoods();

  return Object.entries(foods)
    .map(([id, grams]): FoodQuantity | undefined => {
      const food = foodOf(id);
      return food === undefined ? undefined : { food, grams };
    })
    .filter((quantity): quantity is FoodQuantity => quantity !== undefined);
};

const buildMeal = (slot: MealSlot, raw: RawMeal): Meal | undefined => {
  const { recipeOf } = useRecipes();
  const { macrosOfQuantities } = useNutrition();

  const recipe = recipeOf(raw.recipe);
  if (recipe === undefined) return undefined;

  const quantities = toQuantities(raw.foods);
  const macros = macrosOfQuantities(quantities);
  const reference = macrosOfQuantities(toQuantities(recipe.ingredients));

  return {
    slot,
    recipe,
    quantities,
    macros,
    portionRatio: reference.kcal === 0 ? 1 : macros.kcal / reference.kcal,
  };
};

const buildDay = (key: DayKey, rawMeals: Record<string, RawMeal>): Day => {
  const { sumMacros } = useNutrition();

  const meals = MEAL_ORDER.map((slot): Meal | undefined => {
    const raw = rawMeals[slot];
    return raw === undefined ? undefined : buildMeal(slot, raw);
  }).filter((meal): meal is Meal => meal !== undefined);

  return { key, meals, macros: sumMacros(meals.map((meal): Macros => meal.macros)) };
};

const buildShoppingList = (days: Day[]): ShoppingLine[] => {
  const gramsByFood = new Map<string, FoodQuantity>();

  for (const day of days) {
    for (const meal of day.meals) {
      for (const { food, grams } of meal.quantities) {
        const existing = gramsByFood.get(food.id);
        gramsByFood.set(food.id, { food, grams: (existing?.grams ?? 0) + grams });
      }
    }
  }

  return [...gramsByFood.values()]
    .map(({ food, grams }): ShoppingLine => {
      const rounded = Math.round(grams);
      return { food, grams: rounded, price: (food.pricePerKg * rounded) / 1000 };
    })
    .sort((left, right): number => right.price - left.price);
};

const buildMenu = (raw: RawMenu): Menu => {
  const days = DAY_ORDER.map((key): Day | undefined => {
    const rawDay = raw.days[key];
    return rawDay === undefined ? undefined : buildDay(key, rawDay);
  }).filter((day): day is Day => day !== undefined);

  const shoppingList = buildShoppingList(days);
  const usedRecipeIds = new Set(
    days.flatMap((day): string[] => day.meals.map((meal): string => meal.recipe.id)),
  );
  const { recipeOf } = useRecipes();

  const { tolerancePct, ...targets } = raw.targets;

  return {
    weekOf: raw.weekOf,
    targets,
    tolerancePct: tolerancePct ?? { default: 5 },
    days,
    recipes: [...usedRecipeIds]
      .map((id): Recipe | undefined => recipeOf(id))
      .filter((recipe): recipe is Recipe => recipe !== undefined),
    shoppingList,
    totalPrice: shoppingList.reduce((total, line): number => total + line.price, 0),
  };
};

const menuList: Menu[] = Object.values(menuModules)
  .map((module): Menu => buildMenu(module.default))
  .sort((left, right): number => right.weekOf.localeCompare(left.weekOf));

export const useMenu = (): {
  menus: Menu[];
  currentMenu: Menu | undefined;
  menuOf: (weekOf: string) => Menu | undefined;
  dayOrder: readonly DayKey[];
  mealOrder: readonly MealSlot[];
} => ({
  menus: menuList,
  currentMenu: menuList[0],
  menuOf: (weekOf: string): Menu | undefined =>
    menuList.find((menu): boolean => menu.weekOf === weekOf),
  dayOrder: DAY_ORDER,
  mealOrder: MEAL_ORDER,
});
