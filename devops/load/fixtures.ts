import exec from 'k6/execution';

/** What a person who has used the app for months holds: far from an empty database. */
export const SEED = {
  weights: 120,
  foods: 150,
  recipes: 100,
  weekPlans: 26,
  members: 8,
  jobs: 10,
  reports: 40,
} as const;

export const MEASUREMENTS = {
  sex: 'MALE',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  dailyActivity: 'SEATED',
  trainingDaysPerWeek: 4,
  trainingType: 'STRENGTH',
  starchQuality: 'MIXED',
  appetite: 'AVERAGE',
  goal: 'GAIN_MUSCLE',
} as const;

export const CONTEXT = {
  page: '/week',
  userAgent: 'load-test',
  viewport: '390x844',
  locale: 'en',
} as const;

/** Foods the catalogue ships with, so a recipe or a plan never depends on a seeded row. */
export const BUILT_IN_FOODS = ['brownRice', 'oats', 'chicken', 'broccoli', 'eggs', 'olive'];

let counter = 0;

/**
 * A number no other virtual user and no earlier iteration of this one is using right now.
 * Every row an operation creates is taken back at the end of the iteration, so the range is
 * reused without a clash, and stays small enough for the dates built from it to be valid.
 */
export const unique = (): number => {
  counter += 1;

  return exec.vu.idInTest * 500 + (counter % 500);
};

const addDays = (isoDate: string, days: number): string => {
  const moved = new Date(`${isoDate}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);

  return moved.toISOString().slice(0, 10);
};

/** Mondays, a week apart. */
export const weekOfIndex = (index: number): string => addDays('2026-01-05', index * 7);
export const dayOfIndex = (index: number): string => addDays('2015-01-01', index);

export const foodInput = (index: number): object => ({
  name: `Food ${index}`,
  kcal: 120 + (index % 40),
  protein: 10,
  fat: 5,
  carbs: 12,
  fiber: 2,
  pricePerKg: 8,
});

export const recipeInput = (index: number): object => ({
  name: `Recipe ${index}`,
  slot: 'MAIN',
  ingredients: BUILT_IN_FOODS.slice(0, 5).map((foodId): object => ({ foodId, grams: 150 })),
  steps: ['Cut everything.', 'Cook it gently.', 'Serve warm.'],
  prepMinutes: 20,
  batch: index % 2 === 0,
});

export const memberInput = (index: number): object => ({
  ...MEASUREMENTS,
  name: `Member ${index}`,
});

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const SLOTS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT'];

export const weekPlanInput = (weekOf: string): object => ({
  weekOf,
  days: DAYS.map((day, dayIndex): object => ({
    day,
    meals: SLOTS.map((slot, slotIndex): object => ({
      slot,
      recipeId: BUILT_IN_FOODS[(dayIndex + slotIndex) % BUILT_IN_FOODS.length],
    })),
  })),
});

export const needs = (): object[] =>
  BUILT_IN_FOODS.map((foodId): object => ({ foodId, grams: 960, label: foodId }));

export const outcome = (): object => ({
  outcome: 'SUCCEEDED',
  productsCents: 4200,
  deliveryFeesCents: 590,
  shortOfMinimumCents: 0,
  missingFoodIds: [],
  observations: [
    { ean: '3560070000011', foodId: 'brownRice', name: 'Brown rice', priceCents: 210, size: 500 },
    { ean: '3560070000028', foodId: 'oats', name: 'Oat flakes', priceCents: 190, size: 500 },
  ],
});
