import { PlannedDayKey, PlannedMealSlot } from './enum';

export type PlannedMeal = {
  slot: PlannedMealSlot;
  recipeId: string;
};

export type PlannedDay = {
  day: PlannedDayKey;
  meals: PlannedMeal[];
};

export type WeekPlanRecord = {
  weekOf: string;
  days: PlannedDay[];
  updatedAt: Date;
};
