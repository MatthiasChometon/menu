const mealKey = (day: DayKey, slot: MealSlot): string => `${day}:${slot}`;

// One store per week, kept for the life of the app. The week can change under
// the caller — planning ahead means switching weeks without leaving the page —
// so the storage is resolved on every read rather than bound once.
const statusStores = new Map<string, Ref<Record<string, DishStatus>>>();
const eatenStores = new Map<string, Ref<string[]>>();

const statusesFor = (weekOf: string): Ref<Record<string, DishStatus>> => {
  const existing = statusStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<Record<string, DishStatus>>(`cooking:${weekOf}`, {});
  statusStores.set(weekOf, created);
  return created;
};

const eatenFor = (weekOf: string): Ref<string[]> => {
  const existing = eatenStores.get(weekOf);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<string[]>(`eaten:${weekOf}`, []);
  eatenStores.set(weekOf, created);
  return created;
};

// The menu is the plan; this is the diary kept against it. Both are needed: the
// plan alone cannot say what is left in the fridge on a Tuesday evening.
export const useCookingLog = (
  week: MaybeRefOrGetter<string>,
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
  const statuses = computed((): Record<string, DishStatus> => statusesFor(toValue(week)).value);
  const eaten = computed((): string[] => eatenFor(toValue(week)).value);

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
      const store = statusesFor(toValue(week));
      store.value = { ...store.value, [recipeId]: status };
    },
    isEaten: (day: DayKey, slot: MealSlot): boolean => eaten.value.includes(mealKey(day, slot)),
    toggleEaten: (day: DayKey, slot: MealSlot): void => {
      const store = eatenFor(toValue(week));
      const key = mealKey(day, slot);
      store.value = store.value.includes(key)
        ? store.value.filter((entry): boolean => entry !== key)
        : [...store.value, key];
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
      statusesFor(toValue(week)).value = {};
      eatenFor(toValue(week)).value = [];
    },
  };
};
