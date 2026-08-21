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

export const MACRO_ORDER = ['kcal', 'protein', 'fat', 'carbs', 'fiber'] as const;

// Below this, the spread will absorb it and saying anything would only send
// somebody hunting for a dish to fix a gap they do not have.
const BALANCE_TOLERANCE = 5;

/** How far one macro sits from its target across the week, as a percentage. */
export type MacroGap = { macro: keyof Macros; gapPercent: number };

export type SelectionBalance = {
  /** At least one group is served, so there is something to measure. */
  isReady: boolean;
  /** Every group is served: the figures now describe a whole week. */
  isComplete: boolean;
  isBalanced: boolean;
  /** Only the macros worth mentioning. Empty means nothing needs fixing. */
  gaps: MacroGap[];
  /** Every macro, for the gauge. */
  all: MacroGap[];
  /** How far this macro may stray before it counts as off, as a percentage. */
  toleranceOf: (macro: keyof Macros) => number;
};

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

// How many dishes a slot needs for the week to hold together, and for the solver
// to have a fair chance of landing on the targets.
//
// The floor on the savoury dishes is two, because lunch and dinner must differ
// on the same day. Everywhere else it is one — but it is a real one: a day
// missing a meal forces the remaining ones to be scaled beyond what anyone eats,
// which is exactly when the solver clamps and the day falls off target.
//
// The ceilings keep the week cookable. Fourteen savoury servings split across
// more than four dishes means cooking single portions, which defeats batch
// cooking and inflates the shopping list for no variety anyone notices.
const GROUP_LIMITS: Record<RecipeSlot, { min: number; max: number }> = {
  main: { min: 2, max: 4 },
  breakfast: { min: 1, max: 3 },
  postWorkout: { min: 1, max: 3 },
  snack: { min: 1, max: 3 },
};

// What a dish is built around, worked out from its ingredients rather than
// declared in the content: nobody should have to tag ninety-six recipes by hand
// for a filter, and the answer is already in the shopping list.
const FISH = ['salmon', 'cod', 'shrimp', 'tunaTin', 'mackerelTin', 'sardinesTin'];
const MEAT = ['chickenBreast', 'turkeyBreast', 'leanBeef', 'porkTenderloin', 'ham'];

export const usePlanner = (): {
  plan: Ref<PlannedWeek>;
  groupOrder: readonly RecipeSlot[];
  kindOf: (recipe: Recipe) => DishKind;
  isQuick: (recipe: Recipe) => boolean;
  limitsOf: (group: RecipeSlot) => { min: number; max: number };
  isGroupComplete: (group: RecipeSlot) => boolean;
  isGroupFull: (group: RecipeSlot) => boolean;
  canReachStep: (index: number) => boolean;
  goToStep: (index: number) => void;
  suggestFor: (day: PlannedDay) => DishSwap | undefined;
  recommendedIn: (group: RecipeSlot) => Set<string>;
  /** The macro this dish would help most with, when one is short. */
  fillsIn: (group: RecipeSlot, recipeId: string) => keyof Macros | undefined;
  selectionBalance: ComputedRef<SelectionBalance>;
  /** Fills every group to its minimum with the dishes that fit the targets best. */
  completeSelection: () => void;
  swapsForMacro: (day: PlannedDay, macro: keyof Macros) => MacroSwap[];
  applySwap: (swap: DishSwap) => void;
  step: Ref<number>;
  stepCount: number;
  currentGroup: ComputedRef<RecipeSlot | undefined>;
  isLastStep: ComputedRef<boolean>;
  goNext: () => void;
  goBack: () => void;
  pickAtRandom: (group: RecipeSlot, howMany?: number) => void;
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

  // One meal group per screen. Ninety-six dish cards on a single page is a wall
  // to scroll through; the real task is choosing three dishes, four times over.
  // The last step is the week itself.
  const step = useState<number>('planner:step', (): number => 0);

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

  // Protein counts double. Weighing every macro alike lets a swap trade protein
  // away to tidy up fat and carbohydrate, which on a bulk is the one trade not
  // worth making: the rest of the plan is built around the protein figure.
  const MACRO_WEIGHT: Partial<Record<keyof Macros, number>> = { protein: 2, kcal: 1.5 };

  // How far a day sits from its targets. Used only to rank candidates, so the
  // scale means nothing — only that smaller is better. Gaps already inside
  // tolerance are discounted rather than ignored, so a swap still prefers the
  // middle of the range to its edge.
  const errorOf = (day: PlannedDay): number =>
    day.verdicts.reduce(
      (total, verdict): number =>
        total +
        (Math.abs(verdict.gapPercent) * (MACRO_WEIGHT[verdict.macro] ?? 1)) /
          (verdict.isWithinTolerance ? 4 : 1),
      day.isImpossible ? 100 : 0,
    );

  // Every single swap the day allows, solved and scored. Ninety-six dishes and a
  // 3x3 system make this cheap enough to run on the spot, and a suggestion the
  // reader can refuse beats a red badge that only says no.
  const suggestFor = (day: PlannedDay): DishSwap | undefined => {
    if (day.isValid) return undefined;

    const slots = plan.value.days[day.key] ?? {};
    let best: DishSwap | undefined;
    let bestError = errorOf(day);

    for (const [slot, currentId] of Object.entries(slots) as [MealSlot, string][]) {
      for (const candidate of dishesFor(SLOT_RECIPES[slot])) {
        if (candidate.id === currentId) continue;

        const trial = buildDay(day.key, { ...slots, [slot]: candidate.id });
        const error = errorOf(trial);
        if (error >= bestError) continue;

        bestError = error;
        best = {
          day: day.key,
          slot,
          from: recipeOf(currentId),
          to: candidate,
          becomesValid: trial.isValid,
        };
      }
    }

    return best;
  };

  const gapOf = (day: PlannedDay, macro: keyof Macros): number =>
    day.verdicts.find((verdict): boolean => verdict.macro === macro)?.gapPercent ?? 0;

  // Every swap that genuinely moves one macro, best day first. Naming the macro
  // is not the same as knowing how to fix it: nobody has a table of which dish
  // carries fibre, and being told the number is wrong without being told what
  // to do about it is the part that makes this screen feel closed.
  const swapsForMacro = (day: PlannedDay, macro: keyof Macros): MacroSwap[] => {
    const slots = plan.value.days[day.key] ?? {};
    const before = gapOf(day, macro);
    const found: (MacroSwap & { error: number })[] = [];

    for (const [slot, currentId] of Object.entries(slots) as [MealSlot, string][]) {
      for (const candidate of dishesFor(SLOT_RECIPES[slot])) {
        if (candidate.id === currentId) continue;

        const trial = buildDay(day.key, { ...slots, [slot]: candidate.id });
        // It has to close the gap on the macro that was asked about, not merely
        // tidy the day up somewhere else.
        if (Math.abs(gapOf(trial, macro)) >= Math.abs(before)) continue;

        found.push({
          error: errorOf(trial),
          gain: trial.macros[macro] - day.macros[macro],
          becomesValid: trial.isValid,
          swap: {
            day: day.key,
            slot,
            from: recipeOf(currentId),
            to: candidate,
            becomesValid: trial.isValid,
          },
        });
      }
    }

    // Ranked by the state of the whole day, so a fix for one macro is never one
    // that quietly breaks another.
    return found.sort((left, right): number => left.error - right.error).slice(0, 3);
  };

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

  const kindOf = (recipe: Recipe): DishKind => {
    const ids = Object.keys(recipe.ingredients);
    if (ids.some((id): boolean => FISH.includes(id))) return 'fish';
    if (ids.some((id): boolean => MEAT.includes(id))) return 'meat';
    return 'veggie';
  };

  const dishesFor = (group: RecipeSlot): Recipe[] =>
    Object.values(recipes).filter((recipe): boolean => recipe.slot === group);

  // Nothing can be spread until there is something to eat at midday: the savoury
  // dishes are what the week is built around.
  const canSpread = computed((): boolean => (chosenDishes.value.main ?? []).length > 0);

  // Rotation, with dinner one step ahead of lunch, so the same dish never lands
  // twice in a day — the rule the week has always followed.
  const slotsOnDay = (
    selection: Partial<Record<RecipeSlot, string[]>>,
    index: number,
  ): Partial<Record<MealSlot, string>> => {
    const slots: Partial<Record<MealSlot, string>> = {};

    for (const group of GROUP_ORDER) {
      const picked = selection[group] ?? [];
      if (picked.length === 0) continue;

      for (const [offset, slot] of GROUP_SLOTS[group].entries()) {
        const dish = picked[(index + offset) % picked.length];
        if (dish !== undefined) slots[slot] = dish;
      }
    }

    return slots;
  };

  const spread = (): void => {
    if (!canSpread.value) return;

    for (const [index, day] of dayOrder.entries())
      plan.value.days[day] = slotsOnDay(chosenDishes.value, index);

    touch();
  };

  // What the week would come to if this dish were added. A dish cannot be judged
  // on its own macros: it lands on several days beside whatever else was picked,
  // and it is that whole week the targets are read against.
  const weekErrorWith = (group: RecipeSlot, recipeId: string): number => {
    const selection = {
      ...chosenDishes.value,
      [group]: [...(chosenDishes.value[group] ?? []), recipeId],
    };

    return dayOrder.reduce(
      (total, day, index): number => total + errorOf(buildDay(day, slotsOnDay(selection, index))),
      0,
    );
  };

  // The three dishes that would leave the week closest to its targets. Marking
  // them steers the choice without taking it away — and unlike most such nudges,
  // what is being recommended here is simply what is true. Ranking stays fair
  // even on the first step, where no group is filled yet: every candidate is
  // scored against the same incomplete week.
  // What the current picks would give, spread over a week, without adding
  // anything. Answers "what is missing" while there is still something to do
  // about it — the day view only ever says it once the choosing is over.
  const selectionBalance = computed((): SelectionBalance => {
    // Shown as soon as a first group is served rather than once every group is,
    // otherwise the gauge only ever appears on the last step — when there is
    // nothing left to decide with it.
    const isReady = GROUP_ORDER.some((group): boolean => isGroupComplete(group));
    const isComplete = GROUP_ORDER.every((group): boolean => isGroupComplete(group));
    if (!isReady) {
      return {
        isReady: false,
        isComplete: false,
        isBalanced: false,
        gaps: [],
        all: [],
        toleranceOf: (): number => BALANCE_TOLERANCE,
      };
    }

    const simulated = dayOrder.map((day, index): PlannedDay =>
      buildDay(day, slotsOnDay(chosenDishes.value, index)),
    );

    const gaps = MACRO_ORDER.map((macro): MacroGap => {
      const percents = simulated.map((day): number => gapOf(day, macro));

      return {
        macro,
        // Averaged over the week rather than taken at its worst: a single day
        // off is what the spread is for, and calling that a shortfall would
        // send the reader picking dishes to fix a problem they do not have.
        gapPercent: percents.reduce((total, value): number => total + value, 0) / percents.length,
      };
    });

    return {
      isReady: true,
      isComplete,
      // A week still missing meals is not balanced, it is unfinished — saying
      // otherwise would invite stopping halfway.
      isBalanced: isComplete && simulated.every((day): boolean => day.isValid),
      gaps: gaps.filter((gap): boolean => Math.abs(gap.gapPercent) > BALANCE_TOLERANCE),
      // Every macro, in order, whether or not it needs mentioning: a gauge has
      // to show somebody approaching the target, not only overshooting it.
      all: gaps,
      toleranceOf: (macro: keyof Macros): number =>
        tolerance.value[macro] ?? tolerance.value.default,
    };
  });

  // Fills every group up to its minimum with whichever dish leaves the week
  // closest to the targets, one at a time so each choice is made knowing the
  // last. A correct starting point beats a blank page — and everything it puts
  // in can be swapped afterwards, which is why it fills the minimum rather than
  // the maximum: it opens the door, it does not decide the week.
  const completeSelection = (): void => {
    for (const group of GROUP_ORDER) {
      while ((chosenDishes.value[group] ?? []).length < GROUP_LIMITS[group].min) {
        const candidates = dishesFor(group).filter(
          (recipe): boolean => !(chosenDishes.value[group] ?? []).includes(recipe.id),
        );
        if (candidates.length === 0) break;

        // Scored once per dish, not once per comparison: weekErrorWith builds
        // a whole week each time, and calling it twice per candidate froze the
        // page outright.
        const best = candidates
          .map((recipe): { id: string; error: number } => ({
            id: recipe.id,
            error: weekErrorWith(group, recipe.id),
          }))
          .reduce((chosen, entry): { id: string; error: number } =>
            entry.error < chosen.error ? entry : chosen,
          );

        chosenDishes.value = {
          ...chosenDishes.value,
          [group]: [...(chosenDishes.value[group] ?? []), best.id],
        };
      }
    }
  };

  // Which macro a dish would help most with, among those currently short.
  // Named after the dish, never after the reader: "riche en protéines" is a
  // fact about food, "+18 %" is a score to game.
  const fillsIn = (group: RecipeSlot, recipeId: string): keyof Macros | undefined => {
    const short = selectionBalance.value.all
      .filter((gap): boolean => gap.gapPercent < -selectionBalance.value.toleranceOf(gap.macro))
      .sort((left, right): number => left.gapPercent - right.gapPercent);
    if (short.length === 0) return undefined;

    const selection = {
      ...chosenDishes.value,
      [group]: [...(chosenDishes.value[group] ?? []), recipeId],
    };
    const withDish = dayOrder.map((day, index): PlannedDay =>
      buildDay(day, slotsOnDay(selection, index)),
    );

    // Only worth saying when the dish genuinely closes the widest gap.
    const worst = short[0];
    if (worst === undefined) return undefined;

    const after =
      withDish.reduce((total, day): number => total + gapOf(day, worst.macro), 0) / withDish.length;

    return after > worst.gapPercent ? worst.macro : undefined;
  };

  const recommendedIn = (group: RecipeSlot): Set<string> => {
    const ranked = dishesFor(group)
      .filter((recipe): boolean => !(chosenDishes.value[group] ?? []).includes(recipe.id))
      .map((recipe): { id: string; error: number } => ({
        id: recipe.id,
        error: weekErrorWith(group, recipe.id),
      }))
      .sort((left, right): number => left.error - right.error);

    return new Set(ranked.slice(0, 3).map((entry): string => entry.id));
  };

  const countIn = (group: RecipeSlot): number => (chosenDishes.value[group] ?? []).length;

  const isGroupComplete = (group: RecipeSlot): boolean => countIn(group) >= GROUP_LIMITS[group].min;

  // Walking forward is only allowed once everything behind is settled: a week
  // assembled from half-filled steps is one the solver cannot rescue.
  const canReachStep = (index: number): boolean =>
    index <= step.value ||
    GROUP_ORDER.slice(0, index).every((group): boolean => isGroupComplete(group));

  const currentGroup = computed((): RecipeSlot | undefined => GROUP_ORDER[step.value]);
  const isLastStep = computed((): boolean => step.value >= GROUP_ORDER.length);

  return {
    plan,
    groupOrder: GROUP_ORDER,
    kindOf,
    limitsOf: (group: RecipeSlot): { min: number; max: number } => GROUP_LIMITS[group],
    isGroupComplete,
    isGroupFull: (group: RecipeSlot): boolean => countIn(group) >= GROUP_LIMITS[group].max,
    canReachStep,
    suggestFor,
    recommendedIn,
    fillsIn,
    selectionBalance,
    completeSelection,
    swapsForMacro,
    applySwap: (swap: DishSwap): void => {
      plan.value.days[swap.day] = { ...(plan.value.days[swap.day] ?? {}), [swap.slot]: swap.to.id };
      touch();
    },
    goToStep: (index: number): void => {
      if (canReachStep(index)) step.value = Math.max(0, Math.min(GROUP_ORDER.length, index));
    },
    // Twenty minutes is the line between "I can cook this tonight" and "this is
    // a Sunday job".
    isQuick: (recipe: Recipe): boolean => recipe.prepMinutes <= 20,
    step,
    stepCount: GROUP_ORDER.length + 1,
    currentGroup,
    isLastStep,
    goNext: (): void => {
      step.value = Math.min(GROUP_ORDER.length, step.value + 1);
    },
    goBack: (): void => {
      step.value = Math.max(0, step.value - 1);
    },
    // Deciding four times over is the tiring part; this fills a step with a
    // plausible pick so the reader can adjust rather than start from nothing.
    pickAtRandom: (group: RecipeSlot, howMany = GROUP_LIMITS[group].max): void => {
      const pool = dishesFor(group);
      const picked: string[] = [];
      const available = [...pool];

      while (picked.length < Math.min(howMany, pool.length) && available.length > 0) {
        const index = Math.floor(Math.random() * available.length);
        const [chosen] = available.splice(index, 1);
        if (chosen !== undefined) picked.push(chosen.id);
      }

      chosenDishes.value = { ...chosenDishes.value, [group]: picked };
    },
    chosenDishes,
    dishesFor,
    isChosen: (group: RecipeSlot, recipeId: string): boolean =>
      (chosenDishes.value[group] ?? []).includes(recipeId),
    toggleDish: (group: RecipeSlot, recipeId: string): void => {
      const picked = chosenDishes.value[group] ?? [];
      // Silently refusing a tap would read as a broken button; the picker greys
      // the remaining cards out once the ceiling is reached, so a tap that gets
      // here is always a removal or a legal addition.
      if (!picked.includes(recipeId) && picked.length >= GROUP_LIMITS[group].max) return;

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
