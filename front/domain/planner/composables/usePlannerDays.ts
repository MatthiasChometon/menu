import { daysFrom } from './usePlannerWeek';

const { macroOrder: MACRO_ORDER, defaultTolerance: DEFAULT_TOLERANCE } = usePlannerRules();

export type PlannerDays = {
  plan: Ref<PlannedWeek>;
  /** Which slots are pinned, day by day. Kept apart from the plan itself so a
   *  spread can tell "keep this" from "this is what was there before". */
  locked: Ref<LockedSlots>;
  isDirty: Ref<boolean>;
  /** Marks the week as changed since it was last saved. */
  touch: () => void;
  /** The days this window covers, in order from the day it starts. */
  windowDays: ComputedRef<readonly DayKey[]>;
  targets: ComputedRef<Macros>;
  tolerance: ComputedRef<MacroTolerance>;
  /** A day as the solver would make it, from the plan or from slots tried out. */
  buildDay: (key: DayKey, override?: Partial<Record<MealSlot, string>>) => PlannedDay;
  days: ComputedRef<PlannedDay[]>;
  isComplete: ComputedRef<boolean>;
  isValid: ComputedRef<boolean>;
  /** Whether this slot is pinned: a spread, an improve pass or a generation
   *  leaves it exactly as it is. */
  isLocked: (day: DayKey, slot: MealSlot) => boolean;
  /** Pins or unpins the dish currently in this slot. Does nothing on an empty
   *  one — there is nothing yet to hold in place. */
  toggleLock: (day: DayKey, slot: MealSlot) => void;
  chosen: (day: DayKey, slot: MealSlot) => string | undefined;
  choose: (day: DayKey, slot: MealSlot, recipeId: string | undefined) => void;
  copyDay: (from: DayKey, to: DayKey) => void;
  clearDay: (day: DayKey) => void;
};

// The week as it is laid out on its days: what sits in each slot, what the
// solver makes of each day, and the hand edits that change it.
export const usePlannerDays = (): PlannerDays => {
  const { dayOrder, mealOrder, latestMenu } = useMenu();
  const { recipeOf } = useRecipes();
  const { quantitiesOf } = useRecipeQuantities();
  const { macrosOfQuantities } = useNutrition();
  const { solve } = useMacroSolver();
  const { profile } = useProfile();
  const { week: plannerWeek, length } = usePlannerWeek();

  // The days this window covers, in order from the day it starts — the axis the
  // dishes are spread over and the week is measured on. All windows start on the
  // same weekday, so this is stable as the reader moves between them; it falls
  // back to the plain week only before the browser's date is known.
  const windowDays = computed((): readonly DayKey[] =>
    plannerWeek.value === '' ? dayOrder : daysFrom(plannerWeek.value, length.value),
  );

  // Shared, so leaving the page and coming back does not lose an afternoon of
  // choices. Persisting it properly is the account's job, not this composable's.
  const plan = useState<PlannedWeek>('planner:plan', (): PlannedWeek => ({
    weekOf: plannerWeek.value,
    days: {},
  }));
  const locked = useState<LockedSlots>('planner:locked', (): LockedSlots => ({}));
  const isDirty = useState<boolean>('planner:dirty', (): boolean => false);

  const touch = (): void => {
    isDirty.value = true;
  };

  // A signed-in reader plans against their own targets; otherwise the week is
  // planned against the reference the menus are written to.
  const targets = computed((): Macros => {
    const mine = profile.value?.targets;
    if (mine !== undefined) return mine;

    return latestMenu?.targets ?? { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  });

  const tolerance = computed((): MacroTolerance => latestMenu?.tolerancePct ?? DEFAULT_TOLERANCE);

  const verdictsOf = (macros: Macros): MacroVerdict[] =>
    MACRO_ORDER.map((macro): MacroVerdict => {
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

  const buildDay = (key: DayKey, override?: Partial<Record<MealSlot, string>>): PlannedDay => {
    const slots = override ?? plan.value.days[key] ?? {};
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
    windowDays.value.map((key): PlannedDay => dayComputeds.get(key)?.value ?? buildDay(key)),
  );

  const isLocked = (day: DayKey, slot: MealSlot): boolean => locked.value[day]?.[slot] === true;

  // Nothing to pin until a dish sits in the slot — locking an empty one would
  // freeze nothing and only add a control with no effect to press.
  const toggleLock = (day: DayKey, slot: MealSlot): void => {
    if (plan.value.days[day]?.[slot] === undefined) return;

    const current = locked.value[day] ?? {};
    const daySlots = isLocked(day, slot)
      ? (Object.fromEntries(
          Object.entries(current).filter(([key]): boolean => key !== slot),
        ) as Partial<Record<MealSlot, true>>)
      : { ...current, [slot]: true as const };

    locked.value = { ...locked.value, [day]: daySlots };
  };

  // Mutated in place rather than replaced wholesale. Replacing the plan object
  // invalidates every day at once, so picking one dish re-solved all seven and
  // re-rendered thirty-five pickers; touching only the day that changed keeps
  // the screen responsive.
  const choose = (day: DayKey, slot: MealSlot, recipeId: string | undefined): void => {
    // A locked slot only moves once it is unlocked — the whole point of
    // pinning it is that no further edit, manual or automatic, touches it.
    if (isLocked(day, slot)) return;

    const daySlots = (plan.value.days[day] ??= {});
    // A filtered rebuild rather than `delete`: clearing a slot must drop the
    // key without deleting a computed property.
    const kept = Object.fromEntries(
      Object.entries(daySlots).filter(([key]): boolean => key !== slot),
    ) as Partial<Record<MealSlot, string>>;

    if (recipeId !== undefined) kept[slot] = recipeId;
    plan.value.days[day] = kept;
    touch();
  };

  // Most days repeat with one dish swapped; retyping five choices to change
  // one is what makes a planner tiring.
  const copyDay = (from: DayKey, to: DayKey): void => {
    plan.value.days[to] = { ...(plan.value.days[from] ?? {}) };
    touch();
  };

  // Locked slots survive the clear: the reader pinned them precisely so a
  // sweep like this one would leave them alone.
  const clearDay = (day: DayKey): void => {
    const lockedSlots = locked.value[day] ?? {};
    const existing = plan.value.days[day] ?? {};
    plan.value.days[day] = Object.fromEntries(
      Object.entries(existing).filter(([slot]): boolean => lockedSlots[slot as MealSlot] === true),
    ) as Partial<Record<MealSlot, string>>;
    touch();
  };

  return {
    plan,
    locked,
    isDirty,
    touch,
    windowDays,
    targets,
    tolerance,
    buildDay,
    days,
    isComplete: computed((): boolean =>
      days.value.every((day): boolean => day.meals.length === mealOrder.length),
    ),
    isValid: computed((): boolean => days.value.every((day): boolean => day.isValid)),
    isLocked,
    toggleLock,
    chosen: (day: DayKey, slot: MealSlot): string | undefined => plan.value.days[day]?.[slot],
    choose,
    copyDay,
    clearDay,
  };
};
