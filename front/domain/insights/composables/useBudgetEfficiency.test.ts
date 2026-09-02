import { describe, expect, it } from 'vitest';
import type { Day, Food, FoodQuantity, Macros, Menu, Recipe } from '../../menu/types/menu.type';

const macros = (protein: number): Macros => ({
  kcal: protein * 4,
  protein,
  fat: 0,
  carbs: 0,
  fiber: 0,
});

const foodWith = (pricePerKg: number): Food => ({
  id: 'chicken',
  name: { fr: 'Poulet', en: 'Chicken' },
  aisle: 'butcher',
  icon: 'i-lucide-drumstick',
  unit: 'g',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg,
  micros: {
    iron: 0,
    zinc: 0,
    magnesium: 0,
    calcium: 0,
    potassium: 0,
    vitaminC: 0,
    vitaminD: 0,
    omega3: 0,
  },
});

const recipeWith = (id: string): Recipe => ({
  id,
  slot: 'main',
  name: { fr: id, en: id },
  prepMinutes: 10,
  batch: false,
  ingredients: {},
  seasonings: [],
  steps: { fr: [], en: [] },
});

const mealOf = (
  recipe: Recipe,
  quantities: FoodQuantity[],
  proteinGrams: number,
): Day['meals'][number] => ({
  slot: 'lunch',
  recipe,
  quantities,
  macros: macros(proteinGrams),
  portionRatio: 1,
});

const dayOf = (meals: Day['meals']): Day => ({
  key: 'monday',
  meals,
  macros: macros(meals.reduce((total, meal): number => total + meal.macros.protein, 0)),
});

const menuOf = (weekOf: string, days: Day[], totalPrice: number): Menu => ({
  weekOf,
  targets: macros(0),
  tolerancePct: { default: 5 },
  days,
  recipes: [
    ...new Map(
      days.flatMap((day) => day.meals).map((meal) => [meal.recipe.id, meal.recipe]),
    ).values(),
  ],
  shoppingList: [],
  freshSeasonings: [],
  totalPrice,
});

describe('useBudgetEfficiency', () => {
  it('prices a hundred grams of the week protein against the whole budget', () => {
    const { costPer100gProteinOf } = useBudgetEfficiency();
    const food = foodWith(10);
    const meal = mealOf(recipeWith('roast-chicken'), [{ food, grams: 200 }], 40);
    const menu = menuOf('2026-08-03', [dayOf([meal])], 8);

    expect(costPer100gProteinOf(menu)).toBeCloseTo(20);
  });

  it('has nothing to price without a gram of protein that week', () => {
    const { costPer100gProteinOf } = useBudgetEfficiency();
    const menu = menuOf('2026-08-03', [dayOf([])], 0);

    expect(costPer100gProteinOf(menu)).toBeUndefined();
  });

  it('picks the dish giving the most protein per euro spent', () => {
    const { bestValueDishOf } = useBudgetEfficiency();
    const cheapFood = foodWith(4);
    const pricyFood = foodWith(40);
    const day = dayOf([
      mealOf(recipeWith('lentil-stew'), [{ food: cheapFood, grams: 200 }], 30),
      mealOf(recipeWith('salmon-bowl'), [{ food: pricyFood, grams: 200 }], 30),
    ]);
    const menu = menuOf('2026-08-03', [day], 16);

    expect(bestValueDishOf(menu)?.recipe.id).toBe('lentil-stew');
  });

  it('sums a dish repeated across several days before ranking it', () => {
    const { bestValueDishOf } = useBudgetEfficiency();
    const food = foodWith(10);
    const recipe = recipeWith('roast-chicken');
    const menu = menuOf(
      '2026-08-03',
      [
        dayOf([mealOf(recipe, [{ food, grams: 100 }], 20)]),
        dayOf([mealOf(recipe, [{ food, grams: 100 }], 20)]),
      ],
      2,
    );

    expect(bestValueDishOf(menu)?.proteinPerEuro).toBeCloseTo(20);
  });

  it('orders the weeks chronologically for the budget evolution', () => {
    const { historyOf } = useBudgetEfficiency();

    const history = historyOf([menuOf('2026-08-10', [], 90), menuOf('2026-08-03', [], 80)]);

    expect(history.map((point) => point.weekOf)).toEqual(['2026-08-03', '2026-08-10']);
  });
});
