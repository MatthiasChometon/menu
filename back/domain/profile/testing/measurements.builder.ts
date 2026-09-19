import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '../enum';
import { Measurements } from '../type';

// The answers a middle-of-the-road profile would give. Every test starts from
// these and overrides only what it is actually about, so a new field on the
// form never means editing a dozen unrelated literals.
export const buildMeasurements = (overrides: Partial<Measurements> = {}): Measurements => ({
  sex: Sex.MALE,
  age: 30,
  heightCm: 175,
  weightKg: 75,
  dailyActivity: DailyActivity.SEATED,
  trainingDaysPerWeek: 3,
  trainingType: TrainingType.MIXED,
  starchQuality: StarchQuality.MIXED,
  appetite: Appetite.AVERAGE,
  goal: Goal.MAINTAIN,
  ...overrides,
});
