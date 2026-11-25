import type { WeekPlanInput } from '#gql';
// The enums live in the generated module itself: '#gql' re-exports the inputs
// and the operations, not the enum values the maps below need.
import { PlannedDayKey, PlannedMealSlot } from '#gql/default';

// The API speaks in SCREAMING_CASE enums; the site speaks in the keys its content
// uses. One table each way rather than a clever transform, so a missing case is a
// type error instead of a silent drop.
const DAY_TO_API: Record<DayKey, PlannedDayKey> = {
  monday: PlannedDayKey.MONDAY,
  tuesday: PlannedDayKey.TUESDAY,
  wednesday: PlannedDayKey.WEDNESDAY,
  thursday: PlannedDayKey.THURSDAY,
  friday: PlannedDayKey.FRIDAY,
  saturday: PlannedDayKey.SATURDAY,
  sunday: PlannedDayKey.SUNDAY,
};

const SLOT_TO_API: Record<MealSlot, PlannedMealSlot> = {
  breakfast: PlannedMealSlot.BREAKFAST,
  postWorkout: PlannedMealSlot.POST_WORKOUT,
  lunch: PlannedMealSlot.LUNCH,
  snack: PlannedMealSlot.SNACK,
  dinner: PlannedMealSlot.DINNER,
};

const isDayEntry = (entry: [string, PlannedDayKey]): entry is [DayKey, PlannedDayKey] =>
  Object.hasOwn(DAY_TO_API, entry[0]);

const isSlotEntry = (entry: [string, PlannedMealSlot]): entry is [MealSlot, PlannedMealSlot] =>
  Object.hasOwn(SLOT_TO_API, entry[0]);

const DAY_FROM_API = new Map<string, DayKey>(
  Object.entries(DAY_TO_API)
    .filter(isDayEntry)
    .map(([key, value]): [string, DayKey] => [value, key]),
);

const SLOT_FROM_API = new Map<string, MealSlot>(
  Object.entries(SLOT_TO_API)
    .filter(isSlotEntry)
    .map(([key, value]): [string, MealSlot] => [value, key]),
);

const API_DAYS = new Map<string, PlannedDayKey>(Object.entries(DAY_TO_API));
const API_SLOTS = new Map<string, PlannedMealSlot>(Object.entries(SLOT_TO_API));

const apiDayOf = (day: string): PlannedDayKey => {
  const found = API_DAYS.get(day);
  if (found === undefined) throw new Error(`Unknown day in a plan to save: ${day}`);

  return found;
};

const apiSlotOf = (slot: string): PlannedMealSlot => {
  const found = API_SLOTS.get(slot);
  if (found === undefined) throw new Error(`Unknown meal slot in a plan to save: ${slot}`);

  return found;
};

// An unknown value is refused rather than coerced to Monday or lunch: a plan the
// site cannot read must surface as a failed load (and its retry), not as a week
// quietly rearranged.
const dayFromApi = (value: string): DayKey => {
  const day = DAY_FROM_API.get(value);
  if (day === undefined) throw new Error(`Unknown day in a stored plan: ${value}`);

  return day;
};

const slotFromApi = (value: string): MealSlot => {
  const slot = SLOT_FROM_API.get(value);
  if (slot === undefined) throw new Error(`Unknown meal slot in a stored plan: ${value}`);

  return slot;
};

export const useWeekPlanStore = (): {
  toInput: (plan: PlannedWeek) => WeekPlanInput;
  fromApi: (weekOf: string, days: ApiPlannedDay[]) => PlannedWeek;
  load: (weekOf: string) => Promise<PlannedWeek | undefined>;
  save: (plan: PlannedWeek) => Promise<string | undefined>;
} => {
  // Empty days are dropped: a day nobody composed is an absent day, not a day
  // planned as empty, and sending it back would grow the row for nothing.
  const toInput = (plan: PlannedWeek): WeekPlanInput => ({
    weekOf: plan.weekOf,
    days: Object.entries(plan.days)
      .map(([day, slots]) => ({
        day: apiDayOf(day),
        meals: Object.entries(slots).map(([slot, recipeId]) => ({
          slot: apiSlotOf(slot),
          recipeId: String(recipeId),
        })),
      }))
      .filter((day): boolean => day.meals.length > 0),
  });

  const fromApi = (weekOf: string, days: ApiPlannedDay[]): PlannedWeek => ({
    weekOf,
    days: Object.fromEntries(
      days.map((entry): [DayKey, Partial<Record<MealSlot, string>>] => [
        dayFromApi(entry.day),
        Object.fromEntries(
          entry.meals.map((meal): [MealSlot, string] => [slotFromApi(meal.slot), meal.recipeId]),
        ),
      ]),
    ),
  });

  return {
    toInput,
    fromApi,
    // Undefined means nothing is stored for this week. A failed read throws:
    // "the API did not answer" is not "there is nothing", and callers need to
    // tell the two apart to offer a retry instead of a blank week.
    load: async (weekOf: string): Promise<PlannedWeek | undefined> => {
      const result = await GqlMyWeekPlan({ weekOf });
      const plan = result.myWeekPlan;

      return plan === undefined || plan === null ? undefined : fromApi(plan.weekOf, plan.days);
    },
    save: async (plan: PlannedWeek): Promise<string | undefined> => {
      const result = await GqlSaveWeekPlan({ input: toInput(plan) });

      // The week the whole app shows (Semaine, Courses, Cuisine) is cached under
      // this key by menu/useSelectedWeek. It is keyed by nothing that changes on
      // a save, so without clearing it the reader lands back on the empty week
      // they saw before composing — the menu looks unsaved when it is not.
      // Cleared, the next page that reads it refetches and the week appears.
      clearNuxtData('menu:shown');

      return result.saveWeekPlan.updatedAt;
    },
  };
};
