import { isEligible } from './usePlannerPreferences';

// What a dish is built around, worked out from its ingredients rather than
// declared in the content: nobody should have to tag ninety-six recipes by hand
// for a filter, and the answer is already in the shopping list.
const FISH = ['salmon', 'cod', 'shrimp', 'tunaTin', 'mackerelTin', 'sardinesTin'];
const MEAT = ['chickenBreast', 'turkeyBreast', 'leanBeef', 'porkTenderloin', 'ham'];

// Which recipes a group offers. Recipes keep their content tag (a dish is still
// a 'postWorkout' or a 'snack' in the file), but the snack group pools both:
// the reader picks afternoon en-cas from one list, no post-training framing.
const GROUP_RECIPE_SLOTS: Record<RecipeSlot, readonly RecipeSlot[]> = {
  main: ['main'],
  breakfast: ['breakfast'],
  postWorkout: ['postWorkout'],
  snack: ['snack', 'postWorkout'],
};

type UsePlannerDishes = {
  kindOf: (recipe: Recipe) => DishKind;
  isQuick: (recipe: Recipe) => boolean;
  dishesFor: (group: RecipeSlot) => Recipe[];
  eligibleDishesFor: (group: RecipeSlot) => Recipe[];
};

// The dish pools the composer draws from, and how a dish is classified for the
// preference filters — everything that answers "which recipes may go here", kept
// apart from how a day is scored or a week is spread.
export const usePlannerDishes = (): UsePlannerDishes => {
  const { recipes } = useRecipes();
  const { preferences } = usePlannerPreferences();

  const kindOf = (recipe: Recipe): DishKind => {
    const ids = Object.keys(recipe.ingredients);
    if (ids.some((id): boolean => FISH.includes(id))) return 'fish';
    if (ids.some((id): boolean => MEAT.includes(id))) return 'meat';
    return 'veggie';
  };

  // Twenty minutes is the line between "I can cook this tonight" and "this is
  // a Sunday job".
  const isQuick = (recipe: Recipe): boolean => recipe.prepMinutes <= 20;

  const dishesFor = (group: RecipeSlot): Recipe[] =>
    Object.values(recipes).filter((recipe): boolean =>
      GROUP_RECIPE_SLOTS[group].includes(recipe.slot),
    );

  // The pool an automatic pick or a suggestion may draw from: everything the
  // reader has not ruled out. Manual choice never goes through here — the
  // picker still shows every dish, preferences only steer what the composer
  // reaches for on its own.
  const eligibleDishesFor = (group: RecipeSlot): Recipe[] =>
    dishesFor(group).filter((recipe): boolean =>
      isEligible(preferences.value, kindOf(recipe), recipe.prepMinutes),
    );

  return { kindOf, isQuick, dishesFor, eligibleDishesFor };
};
