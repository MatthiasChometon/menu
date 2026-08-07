// Which recipes may fill which meal. Lunch and dinner share the savoury dishes,
// which is exactly how the week is built today: full portion at noon, reduced
// one in the evening.
const SLOT_RECIPES: Record<MealSlot, RecipeSlot> = {
  breakfast: 'breakfast',
  postWorkout: 'postWorkout',
  lunch: 'main',
  snack: 'snack',
  dinner: 'main',
};

const DEFAULT_TOLERANCE: MacroTolerance = { default: 5, kcal: 4, fiber: 12 };

// Which meals a chosen dish fills. The savoury dishes carry both lunch and
// dinner, which is how the week has always been built: full portion at noon,
// the rest in the evening.
const GROUP_SLOTS: Record<RecipeSlot, MealSlot[]> = {
  main: ['lunch', 'dinner'],
  breakfast: ['breakfast'],
  postWorkout: ['postWorkout'],
  snack: ['snack'],
};

const GROUP_ORDER: readonly RecipeSlot[] = ['main', 'breakfast', 'postWorkout', 'snack'];

export const usePlanner = (): {
  plan: Ref<PlannedWeek>;
  groupOrder: readonly RecipeSlot[];
  chosenDishes: Ref<Partial<Record<RecipeSlot, string[]>>>;
  dishesFor: (group: RecipeSlot) => Recipe[];
  isChosen: (group: RecipeSlot, recipeId: string) => boolean;
  toggleDish: (group: RecipeSlot, recipeId: string) => void;
  canSpread: ComputedRef<boolean>;
  spread: () => void;
  isSaving: Ref<boolean>;
  savedAt: Ref<string | undefined>;
  isDirty: Ref<boolean>;
  canSave: ComputedRef<boolean>;
  save: () => Promise<void>;
  loadFromAccount: () => Promise<void>;
  targets: ComputedRef<Macros>;
  recipesFor: (slot: MealSlot) => Recipe[];
  chosen: (day: DayKey, slot: MealSlot) => string | undefined;
  choose: (day: DayKey, slot: MealSlot, recipeId: string | undefined) => void;
  copyDay: (from: DayKey, to: DayKey) => void;
  clearDay: (day: DayKey) => void;
  days: ComputedRef<PlannedDay[]>;
  isComplete: ComputedRef<boolean>;
  isValid: ComputedRef<boolean>;
} => {
  const { dayOrder, mealOrder, latestMenu } = useMenu();
  const { recipes, recipeOf } = useRecipes();
  const { foodOf } = useFoods();
  const { macrosOfQuantities } = useNutrition();
  const { solve } = useMacroSolver();
  const { profile } = useProfile();
  const { selectedWeek } = useSelectedWeek();
  const { user } = useAuth();
  const { load, save: persist } = useWeekPlanStore();

  // Shared, so leaving the page and coming back does not lose an afternoon of
  // choices. Persisting it properly is the account's job, not this composable's.
  const plan = useState<PlannedWeek>('planner:plan', (): PlannedWeek => ({
    weekOf: selectedWeek.value,
    days: {},
  }));

  // What was picked, before it is spread over the days. Kept apart from the plan
  // so re-spreading is always possible without re-picking.
  const chosenDishes = useState<Partial<Record<RecipeSlot, string[]>>>(
    'planner:dishes',
    (): Partial<Record<RecipeSlot, string[]>> => ({}),
  );

  const isSaving = useState<boolean>('planner:saving', (): boolean => false);
  const savedAt = useState<string | undefined>('planner:savedAt', (): undefined => undefined);
  const isDirty = useState<boolean>('planner:dirty', (): boolean => false);
  const loadedWeek = useState<string | undefined>('planner:loaded', (): undefined => undefined);

  // A signed-in reader plans against their own targets; otherwise the week is
  // planned against the reference the menus are written to.
  const targets = computed((): Macros => {
    const mine = profile.value?.targets;
    if (mine !== undefined) return mine;

    return latestMenu?.targets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  });

  const tolerance = computed((): MacroTolerance => latestMenu?.tolerancePct ?? DEFAULT_TOLERANCE);

  const quantitiesOf = (recipe: Recipe): FoodQuantity[] =>
    Object.entries(recipe.ingredients)
      .map(([id, grams]): FoodQuantity | undefined => {
        const food = foodOf(id);
        return food === undefined ? undefined : { food, grams };
      })
      .filter((quantity): quantity is FoodQuantity => quantity !== undefined);

  const verdictsOf = (macros: Macros): MacroVerdict[] =>
    (['kcal', 'protein', 'fat', 'carbs', 'fiber'] as const).map((macro): MacroVerdict => {
      const target = targets.value[macro];
      const allowed = tolerance.value[macro] ?? tolerance.value.default;
      const gapPercent = target === 0 ? 0 : ((macros[macro] - target) / target) * 100;

      return {
        macro,
        actual: macros[macro],
        target,
        gapPercent,
        isWithinTolerance: Math.abs(gapPercent) <= allowed,
      };
    });

  const buildDay = (key: DayKey): PlannedDay => {
    const slots = plan.value.days[key] ?? {};
    const picked = mealOrder
      .map((slot): { slot: MealSlot; recipe: Recipe } | undefined => {
        const recipeId = slots[slot];
        const recipe = recipeId === undefined ? undefined : recipeOf(recipeId);
        return recipe === undefined ? undefined : { slot, recipe };
      })
      .filter((entry): entry is { slot: MealSlot; recipe: Recipe } => entry !== undefined);

    if (picked.length === 0) {
      return {
        key,
        meals: [],
        macros: macrosOfQuantities([]),
        verdicts: verdictsOf(macrosOfQuantities([])),
        isValid: false,
        isImpossible: false,
      };
    }

    // Solved across the whole day rather than meal by meal: the targets are
    // daily, and a breakfast is only too small relative to what follows it.
    const perMeal = picked.map((entry): FoodQuantity[] => quantitiesOf(entry.recipe));
    const { quantities, macros, clamped } = solve(perMeal.flat(), targets.value);

    // The solver returns one flat list; hand each meal its own slice back.
    let cursor = 0;
    const meals = picked.map((entry, index): PlannedMeal => {
      const size = perMeal[index]?.length ?? 0;
      const mealQuantities = quantities.slice(cursor, cursor + size);
      cursor += size;

      return {
        slot: entry.slot,
        recipe: entry.recipe,
        quantities: mealQuantities,
        macros: macrosOfQuantities(mealQuantities),
      };
    });

    const verdicts = verdictsOf(macros);

    return {
      key,
      meals,
      macros,
      verdicts,
      isValid: verdicts.every((verdict): boolean => verdict.isWithinTolerance),
      isImpossible: clamped,
    };
  };

  // One computed per day, built once. Each reads only its own slice of the plan,
  // so a pick on Monday leaves Tuesday's solver result cached.
  const dayComputeds = new Map<DayKey, ComputedRef<PlannedDay>>(
    dayOrder.map((key): [DayKey, ComputedRef<PlannedDay>] => [
      key,
      computed((): PlannedDay => buildDay(key)),
    ]),
  );

  const days = computed((): PlannedDay[] =>
    dayOrder.map((key): PlannedDay => dayComputeds.get(key)?.value ?? buildDay(key)),
  );

  // Only what belongs to an account can be stored on one, and only a week that
  // changed is worth writing.
  const canSave = computed((): boolean => user.value !== undefined && isDirty.value);

  const touch = (): void => {
    isDirty.value = true;
  };

  const loadFromAccount = async (): Promise<void> => {
    const week = selectedWeek.value;
    if (user.value === undefined || week === '' || loadedWeek.value === week) return;

    loadedWeek.value = week;
    const stored = await load(week);
    if (stored === undefined) return;

    plan.value = stored;
    isDirty.value = false;
  };

  const dishesFor = (group: RecipeSlot): Recipe[] =>
    Object.values(recipes).filter((recipe): boolean => recipe.slot === group);

  // Nothing can be spread until there is something to eat at midday: the savoury
  // dishes are what the week is built around.
  const canSpread = computed((): boolean => (chosenDishes.value.main ?? []).length > 0);

  // Rotation, with dinner one step ahead of lunch, so the same dish never lands
  // twice in a day — the rule the week has always followed.
  const spread = (): void => {
    if (!canSpread.value) return;

    for (const [index, day] of dayOrder.entries()) {
      const slots: Partial<Record<MealSlot, string>> = {};

      for (const group of GROUP_ORDER) {
        const picked = chosenDishes.value[group] ?? [];
        if (picked.length === 0) continue;

        for (const [offset, slot] of GROUP_SLOTS[group].entries()) {
          const dish = picked[(index + offset) % picked.length];
          if (dish !== undefined) slots[slot] = dish;
        }
      }

      plan.value.days[day] = slots;
    }

    touch();
  };

  return {
    plan,
    groupOrder: GROUP_ORDER,
    chosenDishes,
    dishesFor,
    isChosen: (group: RecipeSlot, recipeId: string): boolean =>
      (chosenDishes.value[group] ?? []).includes(recipeId),
    toggleDish: (group: RecipeSlot, recipeId: string): void => {
      const picked = chosenDishes.value[group] ?? [];
      chosenDishes.value = {
        ...chosenDishes.value,
        [group]: picked.includes(recipeId)
          ? picked.filter((id): boolean => id !== recipeId)
          : [...picked, recipeId],
      };
    },
    canSpread,
    spread,
    isSaving,
    savedAt,
    isDirty,
    canSave,
    save: async (): Promise<void> => {
      if (!canSave.value || isSaving.value) return;

      isSaving.value = true;
      try {
        savedAt.value = await persist({ ...plan.value, weekOf: selectedWeek.value });
        isDirty.value = false;
      } finally {
        isSaving.value = false;
      }
    },
    loadFromAccount,
    targets,
    recipesFor: (slot: MealSlot): Recipe[] =>
      Object.values(recipes).filter((recipe): boolean => recipe.slot === SLOT_RECIPES[slot]),
    chosen: (day: DayKey, slot: MealSlot): string | undefined => plan.value.days[day]?.[slot],
    // Mutated in place rather than replaced wholesale. Replacing the plan object
    // invalidates every day at once, so picking one dish re-solved all seven and
    // re-rendered thirty-five pickers; touching only the day that changed keeps
    // the screen responsive.
    choose: (day: DayKey, slot: MealSlot, recipeId: string | undefined): void => {
      const daySlots = (plan.value.days[day] ??= {});
      // A filtered rebuild rather than `delete`: clearing a slot must drop the
      // key without deleting a computed property.
      const kept = Object.fromEntries(
        Object.entries(daySlots).filter(([key]): boolean => key !== slot),
      ) as Partial<Record<MealSlot, string>>;

      if (recipeId !== undefined) kept[slot] = recipeId;
      plan.value.days[day] = kept;
      touch();
    },
    // Most days repeat with one dish swapped; retyping five choices to change
    // one is what makes a planner tiring.
    copyDay: (from: DayKey, to: DayKey): void => {
      plan.value.days[to] = { ...(plan.value.days[from] ?? {}) };
      touch();
    },
    clearDay: (day: DayKey): void => {
      plan.value.days[day] = {};
      touch();
    },
    isComplete: computed((): boolean =>
      days.value.every((day): boolean => day.meals.length === mealOrder.length),
    ),
    isValid: computed((): boolean => days.value.every((day): boolean => day.isValid)),
    days,
  };
};
