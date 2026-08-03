import { ActivityLevel, Goal, Sex } from './enum';

export type Measurements = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};
