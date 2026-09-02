import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';

export type Measurements = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  dailyActivity: DailyActivity;
  trainingDaysPerWeek: number;
  trainingType: TrainingType;
  starchQuality: StarchQuality;
  appetite: Appetite;
  goal: Goal;
};

/** A stored profile: the answers, plus the manual kcal nudge on top of them. */
export type ProfileRecord = Measurements & { kcalAdjustmentKcal: number };
