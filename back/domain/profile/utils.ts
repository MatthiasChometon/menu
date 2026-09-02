import { DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';

export const profileConstraints = (): {
  minAge: number;
  maxAge: number;
  minHeightCm: number;
  maxHeightCm: number;
  minWeightKg: number;
  maxWeightKg: number;
  maxTrainingDaysPerWeek: number;
  minKcalDelta: number;
  maxKcalDelta: number;
  minKcalAdjustment: number;
  maxKcalAdjustment: number;
} => ({
  minAge: 14,
  maxAge: 100,
  minHeightCm: 120,
  maxHeightCm: 230,
  minWeightKg: 35,
  maxWeightKg: 300,
  maxTrainingDaysPerWeek: 14,
  // Bounds on a single nudge from the weight coach action (it only ever sends
  // +150 or -100), and on the cumulative total stored on the profile — wide
  // enough for repeated genuine nudges, narrow enough to catch abuse.
  minKcalDelta: -500,
  maxKcalDelta: 500,
  minKcalAdjustment: -1000,
  maxKcalAdjustment: 1000,
});

// The classic activity multipliers bundle work and training into one figure,
// which cannot describe someone sitting at a desk all day and training every
// evening. Here the day job sets the floor...
export const dailyActivityBase = (): Record<DailyActivity, number> => ({
  [DailyActivity.SEATED]: 1.2,
  [DailyActivity.ON_FEET]: 1.35,
  [DailyActivity.PHYSICAL]: 1.5,
});

// ...and each weekly session adds to it. The figures are set so that a desk job
// plus six or seven sessions lands on the classic "very active" multiplier.
export const trainingIncrementPerSession = (): Record<TrainingType, number> => ({
  [TrainingType.NONE]: 0,
  [TrainingType.STRENGTH]: 0.075,
  [TrainingType.MIXED]: 0.08,
  [TrainingType.CARDIO]: 0.085,
});

// Beyond this the multiplier stops meaning anything: it is the top of the
// published scale, for people training twice a day.
export const maxActivityFactor = (): number => 1.9;

// Past roughly +15% the surplus goes to fat rather than muscle, and a deficit
// steeper than -20% starts costing lean mass, so both stay deliberately modest.
export const goalCalorieAdjustments = (): Record<Goal, number> => ({
  [Goal.LOSE_FAT]: -0.18,
  [Goal.MAINTAIN]: 0,
  [Goal.GAIN_MUSCLE]: 0.12,
});

// Protein is highest when losing: in a deficit it is what protects muscle.
export const proteinPerKg = (): Record<Goal, number> => ({
  [Goal.LOSE_FAT]: 2.4,
  [Goal.MAINTAIN]: 1.8,
  [Goal.GAIN_MUSCLE]: 2.2,
});

// The g/kg figures above are meant for a lean athlete. Applied to the full body
// weight of someone heavier on a slimming allowance they would eat most of the
// day's calories and leave almost no carbohydrate, so protein never takes more
// than this share of the total.
export const maxProteinShareOfKcal = (): number => 0.35;

export const fatPerKg = (): { standard: number; floor: number } => ({
  standard: 1.1,
  // Below approximately 0.8 g/kg, hormone production suffers.
  floor: 0.8,
});

// Fibre follows what the starches actually are rather than a single population
// average: eating only wholegrain pasta, rice, oats and bread mechanically
// carries several times the fibre of the refined versions.
export const fiberPerThousandKcal = (): Record<StarchQuality, number> => ({
  [StarchQuality.WHOLEGRAIN]: 18,
  [StarchQuality.MIXED]: 14,
  [StarchQuality.REFINED]: 12,
});

export const restingEnergy = (
  sex: Sex,
  age: number,
  heightCm: number,
  weightKg: number,
): number => {
  // Mifflin-St Jeor, the formula that predicts resting expenditure most
  // accurately without a body-fat measurement.
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === Sex.MALE ? base + 5 : base - 161;
};
