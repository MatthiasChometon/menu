import type { Food } from '../types/menu.type';

const HOW_MANY = 3;

// How far apart two foods' macros are, per 100 g — the closer to zero, the
// more interchangeable they are in a recipe.
const macroDistance = (food: Food, target: Food): number =>
  Math.sqrt(
    (food.protein - target.protein) ** 2 +
      (food.carbs - target.carbs) ** 2 +
      (food.fat - target.fat) ** 2,
  );

// Same aisle first — it is the closest thing the catalogue has to a food
// group (butcher reads as "protein source", produce as "vegetable"…) — and
// only widened to the whole catalogue when that aisle has nothing else to
// offer (a lone supplement, say).
const candidatesFor = (food: Food, catalog: Food[]): Food[] => {
  const sameAisle = catalog.filter(
    (candidate): boolean => candidate.id !== food.id && candidate.aisle === food.aisle,
  );

  return sameAisle.length > 0 ? sameAisle : catalog.filter((candidate): boolean => candidate.id !== food.id);
};

export const substitutesFor = (food: Food, catalog: Food[]): Food[] =>
  [...candidatesFor(food, catalog)]
    .sort((a, b): number => macroDistance(a, food) - macroDistance(b, food))
    .slice(0, HOW_MANY);

// The weight of the substitute that keeps the same energy as the amount it
// replaces — a rougher but universal stand-in for recomputing every macro
// against the week's targets, which this feature deliberately does not do.
export const gramsEquivalentTo = (original: Food, grams: number, substitute: Food): number =>
  substitute.kcal <= 0 ? grams : Math.round((original.kcal * grams) / substitute.kcal);
