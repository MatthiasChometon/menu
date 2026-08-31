import type {
  Day,
  DayKey,
  Food,
  FoodQuantity,
  Macros,
  MacroTolerance,
  Meal,
  MealSlot,
  Menu,
  Recipe,
  Seasoning,
  ShoppingLine,
} from '../types/menu.type';
import { macrosOfQuantities, sumMacros } from './nutrition';

export type RawMeal = { recipe: string; foods: Record<string, number> };

export type RawMenu = {
  weekOf: string;
  deliveryAt?: string;
  targets: Macros & { tolerancePct?: MacroTolerance };
  days: Record<string, Record<string, RawMeal>>;
};

// The lookups a raw week needs to become a full Menu. The app fills them from its
// content composables; a script fills them from the same files read off disk.
export type MenuCatalog = {
  foodOf: (id: string) => Food | undefined;
  recipeOf: (id: string) => Recipe | undefined;
  freshOf: (recipes: Recipe[]) => Seasoning[];
};

export const dayOrder: readonly DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const mealOrder: readonly MealSlot[] = [
  'breakfast',
  'postWorkout',
  'lunch',
  'snack',
  'dinner',
];

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

export const buildMenu = (raw: RawMenu, catalog: MenuCatalog): Menu => {
  const days = dayOrder
    .map((key): Day | undefined => {
      const rawDay = raw.days[key];
      return rawDay === undefined ? undefined : buildDay(key, rawDay, catalog);
    })
    .filter((day): day is Day => day !== undefined);

  const shoppingList = buildShoppingList(days);
  const usedRecipeIds = new Set(days.flatMap((day): string[] => day.meals.map((meal): string => meal.recipe.id)));
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
