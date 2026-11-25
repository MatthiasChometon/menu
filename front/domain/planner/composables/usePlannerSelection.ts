const {
  slotRecipes: SLOT_RECIPES,
  groupOrder: GROUP_ORDER,
  steps: STEPS,
  limits: GROUP_LIMITS,
} = usePlannerRules();

export type PlannerSelection = {
  groupOrder: readonly RecipeSlot[];
  /** What was picked, before it is spread over the days. Kept apart from the
   *  plan so re-spreading is always possible without re-picking. */
  chosenDishes: Ref<Partial<Record<RecipeSlot, string[]>>>;
  step: Ref<number>;
  stepCount: number;
  /** The screens the composer walks through, each one or more groups. */
  steps: readonly (readonly RecipeSlot[])[];
  /** The groups shown on the current screen — one per step. */
  currentGroups: ComputedRef<readonly RecipeSlot[] | undefined>;
  isLastStep: ComputedRef<boolean>;
  limitsOf: (group: RecipeSlot) => { min: number; max: number };
  isGroupComplete: (group: RecipeSlot) => boolean;
  isGroupFull: (group: RecipeSlot) => boolean;
  /** Every group on this screen is filled to its floor. */
  isStepComplete: (index: number) => boolean;
  canReachStep: (index: number) => boolean;
  goToStep: (index: number) => void;
  goNext: () => void;
  goBack: () => void;
  dishesFor: (group: RecipeSlot) => Recipe[];
  recipesFor: (slot: MealSlot) => Recipe[];
  isChosen: (group: RecipeSlot, recipeId: string) => boolean;
  toggleDish: (group: RecipeSlot, recipeId: string) => void;
  pickAtRandom: (group: RecipeSlot, howMany?: number) => void;
};

const stepGroups = (index: number): readonly RecipeSlot[] => STEPS[index] ?? [];

// Which dishes the reader has picked, and the screens they are picked on. One
// meal group per screen: ninety-six dish cards on a single page is a wall to
// scroll through; the real task is choosing three dishes, four times over. The
// last step is the week itself.
export const usePlannerSelection = (touch: () => void): PlannerSelection => {
  const { dishesFor } = usePlannerDishes();

  const chosenDishes = useState<Partial<Record<RecipeSlot, string[]>>>(
    'planner:dishes',
    (): Partial<Record<RecipeSlot, string[]>> => ({}),
  );
  const step = useState<number>('planner:step', (): number => 0);

  const countIn = (group: RecipeSlot): number => (chosenDishes.value[group] ?? []).length;

  const isGroupComplete = (group: RecipeSlot): boolean => countIn(group) >= GROUP_LIMITS[group].min;

  const isStepComplete = (index: number): boolean =>
    stepGroups(index).every((group): boolean => isGroupComplete(group));

  // Walking forward is only allowed once everything behind is settled: a week
  // assembled from half-filled steps is one the solver cannot rescue.
  const canReachStep = (index: number): boolean =>
    index <= step.value ||
    STEPS.slice(0, index).every((groups): boolean => groups.every(isGroupComplete));

  const goToStep = (index: number): void => {
    if (canReachStep(index)) step.value = Math.max(0, Math.min(STEPS.length, index));
  };

  const goNext = (): void => {
    step.value = Math.min(STEPS.length, step.value + 1);
  };

  const goBack = (): void => {
    step.value = Math.max(0, step.value - 1);
  };

  const toggleDish = (group: RecipeSlot, recipeId: string): void => {
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
  };

  // Deciding four times over is the tiring part; this fills a step with a
  // plausible pick so the reader can adjust rather than start from nothing.
  const pickAtRandom = (group: RecipeSlot, howMany = GROUP_LIMITS[group].max): void => {
    const pool = dishesFor(group);
    const picked: string[] = [];
    const available = [...pool];

    while (picked.length < Math.min(howMany, pool.length) && available.length > 0) {
      const index = Math.floor(Math.random() * available.length);
      const [chosen] = available.splice(index, 1);
      if (chosen !== undefined) picked.push(chosen.id);
    }

    chosenDishes.value = { ...chosenDishes.value, [group]: picked };
  };

  return {
    groupOrder: GROUP_ORDER,
    chosenDishes,
    step,
    stepCount: STEPS.length + 1,
    steps: STEPS,
    currentGroups: computed((): readonly RecipeSlot[] | undefined => STEPS[step.value]),
    isLastStep: computed((): boolean => step.value >= STEPS.length),
    limitsOf: (group: RecipeSlot): { min: number; max: number } => GROUP_LIMITS[group],
    isGroupComplete,
    isGroupFull: (group: RecipeSlot): boolean => countIn(group) >= GROUP_LIMITS[group].max,
    isStepComplete,
    canReachStep,
    goToStep,
    goNext,
    goBack,
    dishesFor,
    recipesFor: (slot: MealSlot): Recipe[] => dishesFor(SLOT_RECIPES[slot]),
    isChosen: (group: RecipeSlot, recipeId: string): boolean =>
      (chosenDishes.value[group] ?? []).includes(recipeId),
    toggleDish,
    pickAtRandom,
  };
};
