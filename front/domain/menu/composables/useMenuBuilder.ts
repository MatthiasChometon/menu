import type {
  Day,
  DayKey,
  FoodQuantity,
  Macros,
  Meal,
  MealSlot,
  Menu,
  MenuCatalog,
  RawMeal,
  RawMenu,
  Recipe,
  ShoppingLine,
} from '../types/menu.type';
import type { MealPointer } from '../types/flex.type';
import { useNutrition } from './useNutrition';

type MenuBuilder = {
  dayOrder: readonly DayKey[];
  mealOrder: readonly MealSlot[];
  isDayKey: (value: unknown) => value is DayKey;
  isMealSlot: (value: unknown) => value is MealSlot;
  isMealPointer: (value: unknown) => value is MealPointer;
  buildShoppingList: (days: Day[]) => ShoppingLine[];
  buildMenu: (raw: RawMenu, catalog: MenuCatalog) => Menu;
};

// Pure, no Nuxt dependency: the check script builds a week exactly as the app does.
export const useMenuBuilder = (): MenuBuilder => {
  const { macrosOfQuantities, sumMacros } = useNutrition();

  const dayOrder: readonly DayKey[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const mealOrder: readonly MealSlot[] = ['breakfast', 'postWorkout', 'lunch', 'snack', 'dinner'];

  const toQuantities = (foods: Record<string, number>, catalog: MenuCatalog): FoodQuantity[] =>
    Object.entries(foods)
      .map(([id, grams]): FoodQuantity | undefined => {
        const food = catalog.foodOf(id);
        return food === undefined ? undefined : { food, grams };
      })
      .filter((quantity): quantity is FoodQuantity => quantity !== undefined);

  const buildMeal = (slot: MealSlot, raw: RawMeal, catalog: MenuCatalog): Meal | undefined => {
    const recipe = catalog.recipeOf(raw.recipe);
    if (recipe === undefined) return undefined;

    const quantities = toQuantities(raw.foods, catalog);
    const macros = macrosOfQuantities(quantities);
    const reference = macrosOfQuantities(toQuantities(recipe.ingredients, catalog));

    return {
      slot,
      recipe,
      quantities,
      macros,
      portionRatio: reference.kcal === 0 ? 1 : macros.kcal / reference.kcal,
    };
  };

  const buildDay = (key: DayKey, rawMeals: Record<string, RawMeal>, catalog: MenuCatalog): Day => {
    const meals = mealOrder
      .map((slot): Meal | undefined => {
        const raw = rawMeals[slot];
        return raw === undefined ? undefined : buildMeal(slot, raw, catalog);
      })
      .filter((meal): meal is Meal => meal !== undefined);

    return { key, meals, macros: sumMacros(meals.map((meal): Macros => meal.macros)) };
  };

  // Every food a set of days needs, once, priced. Shared with the composed
  // week (which has no published shopping list to read) and with the flexed
  // week (which zeroes out whatever a reused pot no longer needs bought).
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

  const buildMenu = (raw: RawMenu, catalog: MenuCatalog): Menu => {
    const days = dayOrder
      .map((key): Day | undefined => {
        const rawDay = raw.days[key];
        return rawDay === undefined ? undefined : buildDay(key, rawDay, catalog);
      })
      .filter((day): day is Day => day !== undefined);

    const shoppingList = buildShoppingList(days);
    const usedRecipeIds = new Set(
      days.flatMap((day): string[] => day.meals.map((meal): string => meal.recipe.id)),
    );
    const recipes = [...usedRecipeIds]
      .map((id): Recipe | undefined => catalog.recipeOf(id))
      .filter((recipe): recipe is Recipe => recipe !== undefined);

    const { tolerancePct, ...targets } = raw.targets;

    return {
      weekOf: raw.weekOf,
      deliveryAt: raw.deliveryAt,
      targets,
      tolerancePct: tolerancePct ?? { default: 5 },
      days,
      recipes,
      shoppingList,
      freshSeasonings: catalog.freshOf(recipes),
      totalPrice: shoppingList.reduce((total, line): number => total + line.price, 0),
    };
  };

  const isDayKey = (value: unknown): value is DayKey =>
    dayOrder.some((key): boolean => key === value);

  const isMealSlot = (value: unknown): value is MealSlot =>
    mealOrder.some((slot): boolean => slot === value);

  const isMealPointer = (value: unknown): value is MealPointer =>
    typeof value === 'object' &&
    value !== null &&
    'day' in value &&
    isDayKey(value.day) &&
    'slot' in value &&
    isMealSlot(value.slot);

  return {
    dayOrder,
    mealOrder,
    isDayKey,
    isMealSlot,
    isMealPointer,
    buildShoppingList,
    buildMenu,
  };
};
