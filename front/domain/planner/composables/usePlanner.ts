import { daysFrom, MAX_LENGTH, MIN_LENGTH } from './usePlannerWeek';

// Which recipes may fill which meal. Lunch and dinner share the savoury dishes,
// which is exactly how the week is built today: full portion at noon, reduced
// one in the evening.
// Which pool fills a meal slot. The two afternoon en-cas draw from the same
// merged pool now: post-training and the snack were folded into one choice, so
// a dish tagged either way can land in either slot.
const SLOT_RECIPES: Record<MealSlot, RecipeSlot> = {
  breakfast: 'breakfast',
  postWorkout: 'snack',
  lunch: 'main',
  snack: 'snack',
  dinner: 'main',
};

const DEFAULT_TOLERANCE: MacroTolerance = { default: 5, kcal: 4, fiber: 12 };

export const MACRO_ORDER = ['kcal', 'protein', 'fat', 'carbs', 'fiber'] as const;

// Below this, the spread will absorb it and saying anything would only send
// somebody hunting for a dish to fix a gap they do not have.
const BALANCE_TOLERANCE = 5;

/** A week being worked on but not saved, held while another one is looked at. */
type WeekDraft = {
  plan: PlannedWeek;
  chosen: Partial<Record<RecipeSlot, string[]>>;
  spreadFrom: string;
  isDirty: boolean;
};

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
// the rest in the evening. The snack group carries both afternoon en-cas — what
// used to be post-training and the snack — from one merged list.
const GROUP_SLOTS: Record<RecipeSlot, MealSlot[]> = {
  main: ['lunch', 'dinner'],
  breakfast: ['breakfast'],
  postWorkout: ['postWorkout'],
  snack: ['postWorkout', 'snack'],
};

// Which recipes a group offers. Recipes keep their content tag (a dish is still
// a 'postWorkout' or a 'snack' in the file), but the snack group pools both:
// the reader picks afternoon en-cas from one list, no post-training framing.
const GROUP_RECIPE_SLOTS: Record<RecipeSlot, readonly RecipeSlot[]> = {
  main: ['main'],
  breakfast: ['breakfast'],
  postWorkout: ['postWorkout'],
  snack: ['snack', 'postWorkout'],
};

// postWorkout is a slot a day still has, but never a group the composer walks
// through on its own: its dishes are chosen inside the snack group.
const GROUP_ORDER: readonly RecipeSlot[] = ['main', 'breakfast', 'snack'];

// One screen per meal in the composer. The two afternoon en-cas were folded
// into a single "Goûter et collation" step: one list, two mandatory picks, one
// per slot when spread. The solver never sees these; it works off GROUP_ORDER.
const STEPS: readonly (readonly RecipeSlot[])[] = [['main'], ['breakfast'], ['snack']];
const stepGroups = (index: number): readonly RecipeSlot[] => STEPS[index] ?? [];

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
  // Two, because the group fills two slots — a morning collation and an
  // afternoon goûter — and each must have a dish for the day to hold together.
  snack: { min: 2, max: 4 },
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
  /** Applies the best single swap to every day, until each is on target or
   *  nothing improves it. The one-tap alternative to fixing days by hand.
   *  Async so the tab stays responsive while a whole week is solved. */
  improveWeek: () => Promise<void>;
  /** True while improveWeek is working, to spin its button and lock it. */
  isImproving: Ref<boolean>;
  step: Ref<number>;
  stepCount: number;
  /** The groups shown on the current screen — one per step. */
  currentGroups: ComputedRef<readonly RecipeSlot[] | undefined>;
  /** The screens the composer walks through, each one or more groups. */
  steps: readonly (readonly RecipeSlot[])[];
  /** Every group on this screen is filled to its floor. */
  isStepComplete: (index: number) => boolean;
  isLastStep: ComputedRef<boolean>;
  goNext: () => void;
  goBack: () => void;
  pickAtRandom: (group: RecipeSlot, howMany?: number) => void;
  chosenDishes: Ref<Partial<Record<RecipeSlot, string[]>>>;
  dishesFor: (group: RecipeSlot) => Recipe[];
  isChosen: (group: RecipeSlot, recipeId: string) => boolean;
  toggleDish: (group: RecipeSlot, recipeId: string) => void;
  /** How many days the window spans, 3 to 7. Two-way, so a selector can set it. */
  length: Ref<number>;
  canSpread: ComputedRef<boolean>;
  /** The selection changed since the week was last spread. */
  needsSpread: ComputedRef<boolean>;
  spread: () => void;
  isSaving: Ref<boolean>;
  savedAt: Ref<string | undefined>;
  isDirty: Ref<boolean>;
  /** The last attempt to save did not go through. */
  saveFailed: Ref<boolean>;
  canSave: ComputedRef<boolean>;
  save: () => Promise<void>;
  loadFromAccount: () => Promise<void>;
  /** Moves the screen to another week, parking the current one's work. */
  switchWeek: (week: string, previous: string | undefined) => void;
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
  const { week: plannerWeek, length } = usePlannerWeek();
  const { user } = useAuth();
  const { load, save: persist } = useWeekPlanStore();

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
  const isImproving = useState<boolean>('planner:improving', (): boolean => false);
  const savedAt = useState<string | undefined>('planner:savedAt', (): undefined => undefined);
  const isDirty = useState<boolean>('planner:dirty', (): boolean => false);
  const saveFailed = useState<boolean>('planner:saveFailed', (): boolean => false);
  // What the selection looked like when the week was last spread, so a dish
  // swapped afterwards is not silently left out of it.
  const spreadFrom = useState<string>('planner:spreadFrom', (): string => '');
  const loadedWeek = useState<string | undefined>('planner:loaded', (): undefined => undefined);
  // One week's work in progress each, kept for as long as the tab lives.
  const drafts = useState<Record<string, WeekDraft>>(
    'planner:drafts',
    (): Record<string, WeekDraft> => ({}),
  );

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
    windowDays.value.map((key): PlannedDay => dayComputeds.get(key)?.value ?? buildDay(key)),
  );

  // Only what belongs to an account can be stored on one, and only a week that
  // changed is worth writing.
  const canSave = computed(
    (): boolean => user.value !== undefined && plannerWeek.value !== '' && isDirty.value,
  );

  const touch = (): void => {
    isDirty.value = true;
  };

  const applySwap = (swap: DishSwap): void => {
    plan.value.days[swap.day] = { ...(plan.value.days[swap.day] ?? {}), [swap.slot]: swap.to.id };
    touch();
  };

  // Solving every allowed swap for a whole week is thousands of buildDay/solve
  // calls; run on the spot in one go, they freeze the tab for seconds and the
  // button reads as if it had crashed. Handing the frame back after each swap
  // lets the grid repaint and the spinner turn, so the wait is visible progress
  // instead of a dead page.
  const yieldToBrowser = (): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve);
    });

  // The one-tap "fix the whole week", where before every off day had to be
  // opened and swapped by hand. Each day is settled on its own — the solver
  // reads a day in isolation, so mending Monday never unsettles Tuesday — and a
  // few passes let a second swap finish what the first started. A day missing a
  // meal is left as it is: no swap can add one, and pretending otherwise would
  // loop.
  const improveWeek = async (): Promise<void> => {
    if (isImproving.value) return;

    isImproving.value = true;
    try {
      const MAX_PASSES = 4;
      for (const key of windowDays.value) {
        for (let pass = 0; pass < MAX_PASSES; pass += 1) {
          const swap = suggestFor(buildDay(key));
          if (swap === undefined) break;
          applySwap(swap);
          await yieldToBrowser();
        }
      }
    } finally {
      isImproving.value = false;
    }
  };

  // The dishes a stored week was built from, read back out of the days. The
  // account keeps the week, not the shortlist that produced it — and coming
  // back to a week with the grid empty reads as if the week had been lost.
  const chosenFrom = (stored: PlannedWeek): Partial<Record<RecipeSlot, string[]>> =>
    Object.fromEntries(
      GROUP_ORDER.map((group): [RecipeSlot, string[]] => [
        group,
        [
          ...new Set(
            Object.values(stored.days).flatMap((slots): string[] =>
              GROUP_SLOTS[group]
                .map((slot): string | undefined => slots?.[slot])
                .filter((id): id is string => id !== undefined),
            ),
          ),
        ].slice(0, GROUP_LIMITS[group].max),
      ]),
    );

  const loadFromAccount = async (): Promise<void> => {
    const week = plannerWeek.value;
    if (user.value === undefined || week === '' || loadedWeek.value === week) return;

    loadedWeek.value = week;
    const stored = await load(week);

    // A week with nothing stored starts blank. Keeping the previous week's
    // choices on screen would offer them up for saving under a date they were
    // never chosen for.
    plan.value = stored ?? { weekOf: week, days: {} };
    chosenDishes.value = stored === undefined ? {} : chosenFrom(stored);
    // A stored week carries its own length: as many days as were saved. Read it
    // back so the window opens the size it was composed at, not the default.
    if (stored !== undefined) {
      const savedDays = Object.keys(stored.days).length;
      if (savedDays > 0) length.value = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, savedDays));
    }
    spreadFrom.value = stored === undefined ? '' : spreadSignature();
    savedAt.value = undefined;
    saveFailed.value = false;
    isDirty.value = false;
  };

  // Switching weeks is switching subjects: whatever is on screen belongs to the
  // week it was read from, and cannot be carried over. What it can do is wait —
  // an afternoon of choices must not be lost to a mis-tapped arrow, and coming
  // back has to bring them back exactly as they were.
  const switchWeek = (week: string, previous: string | undefined): void => {
    if (week === '' || week === previous) return;

    if (previous !== undefined && previous !== '')
      drafts.value[previous] = {
        plan: plan.value,
        chosen: chosenDishes.value,
        spreadFrom: spreadFrom.value,
        isDirty: isDirty.value,
      };

    step.value = 0;
    savedAt.value = undefined;
    saveFailed.value = false;

    const draft = drafts.value[week];
    if (draft !== undefined) {
      plan.value = draft.plan;
      chosenDishes.value = draft.chosen;
      spreadFrom.value = draft.spreadFrom;
      isDirty.value = draft.isDirty;

      return;
    }

    plan.value = { weekOf: week, days: {} };
    chosenDishes.value = {};
    spreadFrom.value = '';
    isDirty.value = false;
    void loadFromAccount();
  };

  const kindOf = (recipe: Recipe): DishKind => {
    const ids = Object.keys(recipe.ingredients);
    if (ids.some((id): boolean => FISH.includes(id))) return 'fish';
    if (ids.some((id): boolean => MEAT.includes(id))) return 'meat';
    return 'veggie';
  };

  const dishesFor = (group: RecipeSlot): Recipe[] =>
    Object.values(recipes).filter((recipe): boolean =>
      GROUP_RECIPE_SLOTS[group].includes(recipe.slot),
    );

  // Nothing can be spread until there is something to eat at midday: the savoury
  // dishes are what the week is built around.
  const canSpread = computed((): boolean => (chosenDishes.value.main ?? []).length > 0);

  // What a spread was built from: the dishes and how many days they were spread
  // over. The length counts, so shortening the window re-spreads rather than
  // leaving the extra days behind.
  const spreadSignature = (): string =>
    JSON.stringify({ dishes: chosenDishes.value, length: length.value });

  const needsSpread = computed(
    (): boolean => canSpread.value && spreadFrom.value !== spreadSignature(),
  );

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

    // Rebuilt from scratch over the window's days, so a day left over from a
    // longer window before is gone rather than lingering in the plan.
    plan.value.days = Object.fromEntries(
      windowDays.value.map((day, index): [DayKey, Partial<Record<MealSlot, string>>] => [
        day,
        slotsOnDay(chosenDishes.value, index),
      ]),
    );

    spreadFrom.value = spreadSignature();
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

    return windowDays.value.reduce(
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
    // Always measured, from the very first card. Appearing halfway through
    // moved the grid a hundred pixels between two taps, and the next dish was
    // no longer under the finger.
    const isComplete = GROUP_ORDER.every((group): boolean => isGroupComplete(group));

    const simulated = windowDays.value.map((day, index): PlannedDay =>
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
    const withDish = windowDays.value.map((day, index): PlannedDay =>
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

  const isStepComplete = (index: number): boolean =>
    stepGroups(index).every((group): boolean => isGroupComplete(group));

  // Walking forward is only allowed once everything behind is settled: a week
  // assembled from half-filled steps is one the solver cannot rescue.
  const canReachStep = (index: number): boolean =>
    index <= step.value ||
    STEPS.slice(0, index).every((groups): boolean => groups.every(isGroupComplete));

  const currentGroups = computed((): readonly RecipeSlot[] | undefined => STEPS[step.value]);
  const isLastStep = computed((): boolean => step.value >= STEPS.length);

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
    applySwap,
    improveWeek,
    isImproving,
    goToStep: (index: number): void => {
      if (canReachStep(index)) step.value = Math.max(0, Math.min(STEPS.length, index));
    },
    // Twenty minutes is the line between "I can cook this tonight" and "this is
    // a Sunday job".
    isQuick: (recipe: Recipe): boolean => recipe.prepMinutes <= 20,
    step,
    stepCount: STEPS.length + 1,
    currentGroups,
    steps: STEPS,
    isStepComplete,
    isLastStep,
    goNext: (): void => {
      step.value = Math.min(STEPS.length, step.value + 1);
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
      touch();
    },
    length,
    canSpread,
    needsSpread,
    spread,
    isSaving,
    savedAt,
    isDirty,
    saveFailed,
    canSave,
    save: async (): Promise<void> => {
      if (!canSave.value || isSaving.value) return;

      isSaving.value = true;
      saveFailed.value = false;
      try {
        savedAt.value = await persist({ ...plan.value, weekOf: plannerWeek.value });
        isDirty.value = false;
      } catch (error: unknown) {
        // Swallowed before: the button simply went back to how it looked, and
        // the week appeared saved when nothing had left the browser.
        saveFailed.value = true;
        console.error('[planner] saving the week failed', error);
      } finally {
        isSaving.value = false;
      }
    },
    loadFromAccount,
    switchWeek,
    targets,
    recipesFor: (slot: MealSlot): Recipe[] => dishesFor(SLOT_RECIPES[slot]),
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
