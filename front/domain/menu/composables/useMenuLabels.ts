import { Goal } from '#gql/default';
import type { DayKey, Macros, MealSlot, WeekName, WeekStatus } from '../types/menu.type';

type MenuLabels = {
  dayLabel: (key: DayKey) => string;
  mealLabel: (slot: MealSlot) => string;
  mealTimeLabel: (slot: MealSlot) => string;
  macroShortLabel: (key: keyof Macros) => string;
  weekLabel: (key: WeekName | WeekStatus) => string;
  weighInReminder: (goal: Goal) => string;
};

// Every label is a literal key, so the translation checker can see which ones
// are used: a key built from a variable is invisible to it and rots silently.
// The tables are computed so they follow the locale.
export const useMenuLabels = (): MenuLabels => {
  const { t } = useNuxtApp().$i18n;

  const days = computed((): Record<DayKey, string> => ({
    monday: t('menu.day.monday'),
    tuesday: t('menu.day.tuesday'),
    wednesday: t('menu.day.wednesday'),
    thursday: t('menu.day.thursday'),
    friday: t('menu.day.friday'),
    saturday: t('menu.day.saturday'),
    sunday: t('menu.day.sunday'),
  }));

  const meals = computed((): Record<MealSlot, string> => ({
    breakfast: t('menu.meal.breakfast'),
    postWorkout: t('menu.meal.postWorkout'),
    lunch: t('menu.meal.lunch'),
    snack: t('menu.meal.snack'),
    dinner: t('menu.meal.dinner'),
  }));

  const mealTimes = computed((): Record<MealSlot, string> => ({
    breakfast: t('menu.mealTime.breakfast'),
    postWorkout: t('menu.mealTime.postWorkout'),
    lunch: t('menu.mealTime.lunch'),
    snack: t('menu.mealTime.snack'),
    dinner: t('menu.mealTime.dinner'),
  }));

  const macrosShort = computed((): Record<keyof Macros, string> => ({
    kcal: t('menu.macroShort.kcal'),
    protein: t('menu.macroShort.protein'),
    fat: t('menu.macroShort.fat'),
    carbs: t('menu.macroShort.carbs'),
    fiber: t('menu.macroShort.fiber'),
  }));

  const weeks = computed((): Record<WeekName | WeekStatus, string> => ({
    last: t('menu.week.last'),
    current: t('menu.week.current'),
    next: t('menu.week.next'),
    upcoming: t('menu.week.upcoming'),
    past: t('menu.week.past'),
  }));

  const weighIns = computed((): Record<Goal, string> => ({
    [Goal.GAIN_MUSCLE]: t('menu.reminder.weighIn.GAIN_MUSCLE'),
    [Goal.LOSE_FAT]: t('menu.reminder.weighIn.LOSE_FAT'),
    [Goal.MAINTAIN]: t('menu.reminder.weighIn.MAINTAIN'),
  }));

  return {
    dayLabel: (key: DayKey): string => days.value[key],
    mealLabel: (slot: MealSlot): string => meals.value[slot],
    mealTimeLabel: (slot: MealSlot): string => mealTimes.value[slot],
    macroShortLabel: (key: keyof Macros): string => macrosShort.value[key],
    weekLabel: (key: WeekName | WeekStatus): string => weeks.value[key],
    weighInReminder: (goal: Goal): string => weighIns.value[goal],
  };
};
