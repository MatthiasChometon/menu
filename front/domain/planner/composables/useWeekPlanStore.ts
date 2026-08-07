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

const DAY_FROM_API = Object.fromEntries(
  Object.entries(DAY_TO_API).map(([key, value]): [string, DayKey] => [value, key as DayKey]),
) as Record<string, DayKey>;

const SLOT_FROM_API = Object.fromEntries(
  Object.entries(SLOT_TO_API).map(([key, value]): [string, MealSlot] => [value, key as MealSlot]),
) as Record<string, MealSlot>;

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
        day: DAY_TO_API[day as DayKey],
        meals: Object.entries(slots ?? {}).map(([slot, recipeId]) => ({
          slot: SLOT_TO_API[slot as MealSlot],
          recipeId: String(recipeId),
        })),
      }))
      .filter((day): boolean => day.meals.length > 0),
  });

  const fromApi = (weekOf: string, days: ApiPlannedDay[]): PlannedWeek => ({
    weekOf,
    days: Object.fromEntries(
      days.map((entry): [DayKey, Partial<Record<MealSlot, string>>] => [
        DAY_FROM_API[entry.day] ?? 'monday',
        Object.fromEntries(
          entry.meals.map((meal): [MealSlot, string] => [
            SLOT_FROM_API[meal.slot] ?? 'lunch',
            meal.recipeId,
          ]),
        ),
      ]),
    ),
  });

  return {
    toInput,
    fromApi,
    // Signed out, or the API asleep: the screen keeps working on what the tab
    // holds rather than blanking out.
    load: async (weekOf: string): Promise<PlannedWeek | undefined> => {
      const result = await GqlMyWeekPlan({ weekOf }).catch((): undefined => undefined);
      const plan = result?.myWeekPlan;

      return plan === undefined || plan === null ? undefined : fromApi(plan.weekOf, plan.days);
    },
    save: async (plan: PlannedWeek): Promise<string | undefined> => {
      const result = await GqlSaveWeekPlan({ input: toInput(plan) });

      return result.saveWeekPlan.updatedAt;
    },
  };
};
