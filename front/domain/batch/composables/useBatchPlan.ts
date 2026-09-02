const mergeQuantities = (meals: Meal[]): FoodQuantity[] => {
  const byFood = new Map<string, FoodQuantity>();

  for (const meal of meals) {
    for (const { food, grams } of meal.quantities) {
      const existing = byFood.get(food.id);
      byFood.set(food.id, { food, grams: (existing?.grams ?? 0) + grams });
    }
  }

  return [...byFood.values()]
    .map(({ food, grams }): FoodQuantity => ({ food, grams: Math.round(grams) }))
    .sort((left, right): number => right.grams - left.grams);
};

// A dish rarely needs the cook's hands for its whole cooking time: a chili
// takes a couple of minutes to brown and season, then simmers on its own. This
// caps how long any single task is assumed to hold the cook, so the schedule
// below can start the next dish while this one simmers unattended. Quick
// dishes (a salad, a wrap) are hands-on for their entire, short duration.
const HANDS_ON_MINUTES = 12;

const handsOnMinutesOf = (task: BatchTask): number => Math.min(task.minutes, HANDS_ON_MINUTES);

// One cook, one pair of hands: dishes are picked up one after another, but
// each is only held long enough to get it going, then left to simmer, bake or
// rest while the next one is picked up. Longest dishes come first (tasks are
// already sorted that way) so the ones that need the most unattended time get
// the earliest start.
const scheduleTimeline = (tasks: BatchTask[]): BatchTimelineStep[] => {
  let cookFreeAt = 0;

  return tasks.map((task): BatchTimelineStep => {
    const startsAt = cookFreeAt;
    const handsOnUntil = startsAt + handsOnMinutesOf(task);
    cookFreeAt = handsOnUntil;

    return { task, startsAt, handsOnUntil, endsAt: startsAt + task.minutes };
  });
};

const makespanOf = (timeline: BatchTimelineStep[]): number =>
  timeline.reduce((latest, step): number => Math.max(latest, step.endsAt), 0);

export const useBatchPlan = (): { planOf: (menu: Menu) => BatchPlan } => ({
  // Sunday cooking needs the week's total per dish, not per meal: one pot of
  // chili for six servings, weighed once.
  planOf: (menu: Menu): BatchPlan => {
    const mealsByRecipe = new Map<string, Meal[]>();

    for (const day of menu.days) {
      for (const meal of day.meals) {
        mealsByRecipe.set(meal.recipe.id, [...(mealsByRecipe.get(meal.recipe.id) ?? []), meal]);
      }
    }

    const allTasks = [...mealsByRecipe.values()]
      .map((meals): BatchTask | undefined => {
        const recipe = meals[0]?.recipe;
        if (recipe === undefined) return undefined;

        return {
          recipe,
          servings: meals.length,
          quantities: mergeQuantities(meals),
          minutes: recipe.prepMinutes,
        };
      })
      .filter((task): task is BatchTask => task !== undefined)
      .sort((left, right): number => right.minutes - left.minutes);

    const tasks = allTasks.filter((task): boolean => task.recipe.batch);
    const timeline = scheduleTimeline(tasks);

    return {
      tasks,
      freshTasks: allTasks.filter((task): boolean => !task.recipe.batch),
      totalMinutes: tasks.reduce((total, task): number => total + task.minutes, 0),
      timeline,
      makespanMinutes: makespanOf(timeline),
    };
  },
});
