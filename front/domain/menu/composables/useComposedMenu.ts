import { daysFrom } from '../../planner/composables/usePlannerWeek';
import type { Day, FoodQuantity, Macros, Menu, ShoppingLine } from '../types/menu.type';

// Turns a week somebody composed into the same Menu shape the rest of the app
// reads — but with the grammes worked out here rather than stored. A composition
// keeps only which dish fills which slot; the amounts follow from the reader's
// own targets, so the same week weighs differently for two people. This is what
// lets "Semaine", "Courses" and "Cuisine" show each account its own menu.
//
// The sibling of useMenu, which built a Menu from a published file. That file is
// gone: the only source of a week now is what the account put in the Composer.

// The reference the published menus were written to. Kept as a constant here
// because there is no published menu left to read it from.
const TOLERANCE = { default: 5, kcal: 4, fiber: 12 } as const;

export const useComposedMenu = (): {
  menuFor: (weekOf: string) => Promise<Menu | undefined>;
} => {
  const { load } = useWeekPlanStore();
  const { recipeOf } = useRecipes();
  const { foodOf } = useFoods();
  const { macrosOfQuantities } = useNutrition();
  const { solve } = useMacroSolver();
  const { freshOf } = useSeasonings();
  const { profile } = useProfile();
  const { mealOrder } = useMenu();

  // A recipe as written, before it is scaled: its ingredients at their reference
  // grammes. The solver takes these and stretches them to the day's targets.
  const referenceOf = (recipeId: string): FoodQuantity[] => {
    const recipe = recipeOf(recipeId);
    if (recipe === undefined) return [];

    return Object.entries(recipe.ingredients)
      .map(([id, grams]): FoodQuantity | undefined => {
        const food = foodOf(id);
        return food === undefined ? undefined : { food, grams };
      })
      .filter((quantity): quantity is FoodQuantity => quantity !== undefined);
  };

  // One day of a composition, solved across all its meals at once: the targets
  // are daily, and a breakfast is only ever too small relative to what follows.
  const buildDay = (
    key: Day['key'],
    slots: Partial<Record<Day['meals'][number]['slot'], string>>,
    targets: Macros,
  ): Day | undefined => {
    const picked = mealOrder
      .map((slot): { slot: Day['meals'][number]['slot']; recipeId: string } | undefined => {
        const recipeId = slots[slot];
        return recipeId === undefined ? undefined : { slot, recipeId };
      })
      .filter((entry): entry is { slot: Day['meals'][number]['slot']; recipeId: string } =>
        entry !== undefined,
      );
    if (picked.length === 0) return undefined;

    const perMeal = picked.map((entry): FoodQuantity[] => referenceOf(entry.recipeId));
    const { quantities } = solve(perMeal.flat(), targets);

    // The solver hands back one flat list in the order it was given; each meal
    // takes its own slice back.
    let cursor = 0;
    const meals = picked
      .map((entry, index): Day['meals'][number] | undefined => {
        const recipe = recipeOf(entry.recipeId);
        if (recipe === undefined) return undefined;

        const size = perMeal[index]?.length ?? 0;
        const scaled = quantities
          .slice(cursor, cursor + size)
          .map(({ food, grams }): FoodQuantity => ({ food, grams }));
        cursor += size;

        const macros = macrosOfQuantities(scaled);
        const reference = macrosOfQuantities(perMeal[index] ?? []);

        return {
          slot: entry.slot,
          recipe,
          quantities: scaled,
          macros,
          portionRatio: reference.kcal === 0 ? 1 : macros.kcal / reference.kcal,
        };
      })
      .filter((meal): meal is Day['meals'][number] => meal !== undefined);

    return { key, meals, macros: macrosOfQuantities(meals.flatMap((meal) => meal.quantities)) };
  };

  // Every food the week needs, once, priced. The same aggregation the published
  // menu used, kept here now that its owner is gone.
  const shoppingListOf = (days: Day[]): ShoppingLine[] => {
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

  return {
    // Undefined has one meaning the caller acts on: there is nothing to show for
    // this week. No profile (nothing to scale to) and no composed week both land
    // there, and both are answered by the same invitation to compose.
    menuFor: async (weekOf: string): Promise<Menu | undefined> => {
      const targets = profile.value?.targets;
      if (targets === undefined) return undefined;

      const plan = await load(weekOf);
      if (plan === undefined) return undefined;

      // In window order — from the day the week starts, not Monday — so the
      // first card is the first day actually being planned.
      const days = daysFrom(weekOf)
        .map((key): Day | undefined => {
          const slots = plan.days[key];
          return slots === undefined ? undefined : buildDay(key, slots, targets);
        })
        .filter((day): day is Day => day !== undefined);
      if (days.length === 0) return undefined;

      const shoppingList = shoppingListOf(days);
      const usedIds = new Set(days.flatMap((day) => day.meals.map((meal) => meal.recipe.id)));
      const recipes = [...usedIds]
        .map((id) => recipeOf(id))
        .filter((recipe): recipe is NonNullable<ReturnType<typeof recipeOf>> => recipe !== undefined);

      return {
        weekOf,
        targets,
        tolerancePct: TOLERANCE,
        days,
        recipes,
        shoppingList,
        freshSeasonings: freshOf(recipes),
        totalPrice: shoppingList.reduce((total, line): number => total + line.price, 0),
      };
    },
  };
};
