const mealKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

// The menu is the plan; this is the diary kept against it. Both are needed: the
// plan alone cannot say what is left in the fridge on a Tuesday evening.
export const useCookingLog = (
  weekOf: string,
): {
  statusOf: (recipeId: string) => DishStatus;
  setStatus: (recipeId: string, status: DishStatus) => void;
  isEaten: (day: DayKey, slot: MealSlot) => boolean;
  toggleEaten: (day: DayKey, slot: MealSlot) => void;
  eatenCountOf: (menu: Menu, recipeId: string) => number;
  servingsOf: (menu: Menu, recipeId: string) => number;
  progressOf: (menu: Menu) => DishProgress[];
  reset: () => void;
} => {
  // Keyed by week, like the shopping basket: a new menu starts from a clean
  // slate instead of inheriting last week's ticks.
  const statuses = useLocalStorage<Record<string, DishStatus>>(`cooking:${weekOf}`, {});
  const eaten = useLocalStorage<string[]>(`eaten:${weekOf}`, []);

  const servingsOf = (menu: Menu, recipeId: string): number =>
    menu.days.reduce(
      (total, day): number =>
        total + day.meals.filter((meal): boolean => meal.recipe.id === recipeId).length,
      0,
    );

  const eatenCountOf = (menu: Menu, recipeId: string): number =>
    menu.days.reduce(
      (total, day): number =>
        total +
        day.meals.filter(
          (meal): boolean =>
            meal.recipe.id === recipeId && eaten.value.includes(mealKey(day.key, meal.slot)),
        ).length,
      0,
    );

  const statusOf = (recipeId: string): DishStatus => statuses.value[recipeId] ?? 'todo';

  return {
    statusOf,
    setStatus: (recipeId: string, status: DishStatus): void => {
      statuses.value = { ...statuses.value, [recipeId]: status };
    },
    isEaten: (day: DayKey, slot: MealSlot): boolean => eaten.value.includes(mealKey(day, slot)),
    toggleEaten: (day: DayKey, slot: MealSlot): void => {
      const key = mealKey(day, slot);
      eaten.value = eaten.value.includes(key)
        ? eaten.value.filter((entry): boolean => entry !== key)
        : [...eaten.value, key];
    },
    eatenCountOf,
    servingsOf,
    progressOf: (menu: Menu): DishProgress[] =>
      menu.recipes.map((recipe): DishProgress => {
        const status = statusOf(recipe.id);
        const servings = servingsOf(menu, recipe.id);

        return {
          recipe,
          status,
          servings,
          // Nothing is in the fridge until the dish has been cooked, however
          // many of its meals have gone by.
          left: status === 'done' ? Math.max(0, servings - eatenCountOf(menu, recipe.id)) : 0,
        };
      }),
    reset: (): void => {
      statuses.value = {};
      eaten.value = [];
    },
  };
};
