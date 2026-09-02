import { startOf } from '../../planner/composables/usePlannerWeek';

// When each slot's window opens. The recipe schedule the meals are written for
// (see menu.mealTime in the menu translation): from a slot's own start until
// the next one begins is when it counts as "now".
const SLOT_START_MINUTES: Record<MealSlot, number> = {
  breakfast: 7 * 60,
  postWorkout: 10 * 60 + 30,
  lunch: 12 * 60 + 30,
  snack: 16 * 60 + 30,
  dinner: 20 * 60 + 30,
};

const minutesSinceMidnight = (date: Date): number => date.getHours() * 60 + date.getMinutes();

// The last slot whose window has already opened: with the day's meals kept in
// their natural order, that slot is the one running right now.
const lastStartedIndex = (meals: Meal[], minutes: number): number | undefined => {
  let result: number | undefined;
  meals.forEach((meal, index): void => {
    if (SLOT_START_MINUTES[meal.slot] <= minutes) result = index;
  });

  return result;
};

// The slot to put in the spotlight, and whether it is actually under way —
// pulled out of the composable below so the time arithmetic can be tested
// directly, the way usePlannerWeek tests startOf/weeksFrom.
export const featuredSlotOf = (
  meals: Meal[],
  now: Date,
): { index: number; isCurrent: boolean } | undefined => {
  if (meals.length === 0) return undefined;

  const minutes = minutesSinceMidnight(now);
  const started = lastStartedIndex(meals, minutes);

  return started === undefined
    ? { index: 0, isCurrent: false }
    : { index: started, isCurrent: true };
};

// What to eat right now, and what comes after — the daily screen's reason to
// exist. A menu says what a whole week holds; this narrows it down to the one
// meal that matters at the moment somebody opens the app.
export const useToday = (): {
  isLoading: ComputedRef<boolean>;
  hasMenuToday: ComputedRef<boolean>;
  isFeaturedCurrent: ComputedRef<boolean>;
  featuredMeal: ComputedRef<TodayMeal | undefined>;
  upcomingMeal: ComputedRef<TodayMeal | undefined>;
} => {
  const isMounted = useMounted();
  // "Now" is only knowable in the browser: a prerendered page would otherwise
  // freeze on whatever moment it was built at.
  const now = computed((): Date | undefined => (isMounted.value ? new Date() : undefined));

  const { menus, dayOrder } = useMenu();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { menuFor } = useComposedMenu();
  const { isWithin, dayIndexOf } = useWeekStatus();

  // The app's own definition of "the current week": the rolling seven-day
  // window that starts today (see usePlannerWeek) — the same one a signed-in
  // reader's Semaine/Courses/Cuisine screens default to.
  const weekOfToday = computed((): string | undefined =>
    now.value === undefined ? undefined : startOf(now.value),
  );

  // Signed out, the only week to show is the example the app ships with — and
  // only when it actually happens to cover today, never a day borrowed from it.
  const demoMenuForToday = (reference: Date): Menu | undefined =>
    menus.find((menu): boolean => isWithin(menu.weekOf, reference));

  const { data: menuToday, status } = useAsyncData<Menu | undefined>(
    'today:menu',
    async (): Promise<Menu | undefined> => {
      if (now.value === undefined || weekOfToday.value === undefined) return undefined;
      if (user.value === undefined) return demoMenuForToday(now.value);
      if (profile.value === undefined) return undefined;

      return menuFor(weekOfToday.value);
    },
    { watch: [user, profile, weekOfToday], default: (): undefined => undefined },
  );

  const todayKey = computed((): DayKey | undefined =>
    now.value === undefined ? undefined : dayOrder[dayIndexOf(now.value)],
  );

  const todayMeals = computed(
    (): Meal[] =>
      menuToday.value?.days.find((day): boolean => day.key === todayKey.value)?.meals ?? [],
  );

  // Before the first slot of the day, nothing has started yet: the first meal
  // is what is coming up, so it takes the spotlight rather than showing nothing.
  const featured = computed((): { index: number; isCurrent: boolean } | undefined =>
    now.value === undefined ? undefined : featuredSlotOf(todayMeals.value, now.value),
  );

  const mealAt = (offset: number): TodayMeal | undefined => {
    const index = featured.value?.index;
    const day = todayKey.value;
    const meal = index === undefined ? undefined : todayMeals.value[index + offset];

    return meal === undefined || day === undefined ? undefined : { day, meal };
  };

  return {
    isLoading: computed((): boolean => !isMounted.value || status.value === 'pending'),
    hasMenuToday: computed((): boolean => todayMeals.value.length > 0),
    isFeaturedCurrent: computed((): boolean => featured.value?.isCurrent ?? false),
    featuredMeal: computed((): TodayMeal | undefined => mealAt(0)),
    upcomingMeal: computed((): TodayMeal | undefined => mealAt(1)),
  };
};
