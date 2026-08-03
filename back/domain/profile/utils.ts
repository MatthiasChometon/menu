import { ActivityLevel, Goal, Sex } from './enum';

export const profileConstraints = (): {
  minAge: number;
  maxAge: number;
  minHeightCm: number;
  maxHeightCm: number;
  minWeightKg: number;
  maxWeightKg: number;
} => ({
  minAge: 14,
  maxAge: 100,
  minHeightCm: 120,
  maxHeightCm: 230,
  minWeightKg: 35,
  maxWeightKg: 300,
});

// Harris-Benedict style multipliers, the ones Mifflin-St Jeor is normally
// paired with.
export const activityFactors = (): Record<ActivityLevel, number> => ({
  [ActivityLevel.SEDENTARY]: 1.2,
  [ActivityLevel.LIGHT]: 1.375,
  [ActivityLevel.MODERATE]: 1.55,
  [ActivityLevel.ACTIVE]: 1.725,
  [ActivityLevel.VERY_ACTIVE]: 1.9,
});

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

export const fiberPerThousandKcal = (): number => 14;

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
