import { expectPresent, type GraphqlResponse, type TestApp } from '../testing/e2e-app';

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

export const PASSWORD = 'a-long-enough-password';
export const ADMIN_EMAIL = 'matthias@example.com';
export const READER_EMAIL = 'someone-else@example.com';

export type Who = 'anonymous' | 'reader' | 'admin' | 'device';

export type World = {
  api: TestApp;
  cookies: { reader: string; admin: string };
  deviceToken: string;
  /** Rows the operations that read, update or delete one thing aim at. */
  ids: {
    food: string;
    recipe: string;
    weight: string;
    member: string;
    /** A run taken by the paired browser, which can take events and be finished. */
    runningJob: string;
    bugReport: string;
    improvement: string;
  };
  weekOf: string;
};

type Caller = Pick<World, 'api' | 'cookies' | 'deviceToken'>;

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
  userAgent: 'budget-test',
  viewport: '390x844',
  locale: 'en',
} as const;

export const foodInput = (index: number): object => ({
  name: `Food ${index}`,
  kcal: 120 + (index % 40),
  protein: 10,
  fat: 5,
  carbs: 12,
  fiber: 2,
  pricePerKg: 8,
});

export const recipeInput = (index: number, foodIds: string[]): object => ({
  name: `Recipe ${index}`,
  slot: 'MAIN',
  ingredients: foodIds.slice(0, 5).map((foodId): object => ({ foodId, grams: 150 })),
  steps: ['Cut everything.', 'Cook it gently.', 'Serve warm.'],
  prepMinutes: 20,
  batch: index % 2 === 0,
});

export const memberInput = (index: number): object => ({
  ...MEASUREMENTS,
  name: `Member ${index}`,
});

const addDays = (isoDate: string, days: number): string => {
  const moved = new Date(`${isoDate}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);

  return moved.toISOString().slice(0, 10);
};

/** Mondays, a week apart. */
export const weekOfIndex = (index: number): string => addDays('2026-01-05', index * 7);
export const dayOfIndex = (index: number): string => addDays('2015-01-01', index);

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const SLOTS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT'];

export const weekPlanInput = (weekOf: string, recipeIds: string[]): object => ({
  weekOf,
  days: DAYS.map((day, dayIndex): object => ({
    day,
    meals: SLOTS.map((slot, slotIndex): object => ({
      slot,
      recipeId: recipeIds[(dayIndex * 5 + slotIndex) % recipeIds.length] ?? 'brownRice',
    })),
  })),
});

export const needs = (): object[] =>
  ['brownRice', 'oats', 'chicken', 'broccoli', 'eggs', 'olive'].map((foodId): object => ({
    foodId,
    grams: 960,
    label: foodId,
  }));

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

/** One GraphQL call that fails loudly: a budget measured on an error proves nothing. */
export const call = async <Data>(
  world: Caller,
  who: Who,
  query: string,
  variables?: object,
): Promise<Data> => {
  const cookie = who === 'reader' || who === 'admin' ? world.cookies[who] : undefined;
  const headers = who === 'device' ? { 'x-grocery-device-token': world.deviceToken } : undefined;
  const response: GraphqlResponse<Data> = await world.api.graphql<Data>(
    query,
    variables,
    cookie,
    headers,
  );
  if (response.errors !== undefined) {
    throw new Error(`${query.trim().slice(0, 70)} failed: ${JSON.stringify(response.errors)}`);
  }

  return expectPresent(response.data, 'the data');
};

type Created = { id: string };
type Sizes = { [Key in keyof typeof SEED]: number };

const repeat = async (count: number, work: (index: number) => Promise<void>): Promise<void> => {
  for (let index = 0; index < count; index += 1) await work(index);
};

/** Fills the reader's account with months of data, through the same API the app uses. */
export const seedReader = async (
  world: Caller,
  size: Sizes = SEED,
): Promise<{ foodIds: string[]; recipeIds: string[]; weightId: string; memberId: string }> => {
  await call(
    world,
    'reader',
    `mutation ($i: MeasurementsInput!) { saveProfile(input: $i) { age } }`,
    {
      i: MEASUREMENTS,
    },
  );

  const foodIds: string[] = [];
  await repeat(size.foods, async (index): Promise<void> => {
    const { createCustomFood } = await call<{ createCustomFood: Created }>(
      world,
      'reader',
      `mutation ($i: CustomFoodInput!) { createCustomFood(input: $i) { id } }`,
      { i: foodInput(index) },
    );
    foodIds.push(createCustomFood.id);
  });

  const recipeIds: string[] = [];
  await repeat(size.recipes, async (index): Promise<void> => {
    const { createCustomRecipe } = await call<{ createCustomRecipe: Created }>(
      world,
      'reader',
      `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`,
      { i: recipeInput(index, foodIds.slice(index % 100)) },
    );
    recipeIds.push(createCustomRecipe.id);
  });

  let weightId = '';
  await repeat(size.weights, async (index): Promise<void> => {
    const { addWeightEntry } = await call<{ addWeightEntry: Created }>(
      world,
      'reader',
      `mutation ($i: WeightEntryInput!) { addWeightEntry(input: $i) { id } }`,
      { i: { date: dayOfIndex(index), kg: 80 - index / 20 } },
    );
    weightId = addWeightEntry.id;
  });

  await repeat(size.weekPlans, async (index): Promise<void> => {
    await call(
      world,
      'reader',
      `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`,
      {
        i: weekPlanInput(weekOfIndex(index), recipeIds),
      },
    );
  });

  let memberId = '';
  await repeat(size.members, async (index): Promise<void> => {
    const { addHouseholdMember } = await call<{ addHouseholdMember: Created }>(
      world,
      'reader',
      `mutation ($i: HouseholdMemberInput!) { addHouseholdMember(input: $i) { id } }`,
      { i: memberInput(index) },
    );
    memberId = addHouseholdMember.id;
  });

  return { foodIds, recipeIds, weightId, memberId };
};

/** Queues a run for the week; the oldest waiting one is what the browser takes next. */
export const queueJob = async (world: Caller): Promise<string> => {
  const { createGroceryJob } = await call<{ createGroceryJob: Created }>(
    world,
    'reader',
    `mutation ($i: CreateGroceryJobInput!) { createGroceryJob(input: $i) { id } }`,
    { i: { weekOf: weekOfIndex(1), needs: needs() } },
  );

  return createGroceryJob.id;
};

/** The browser takes the oldest waiting run. */
export const claimJob = async (world: Caller): Promise<string> => {
  const { claimGroceryJob } = await call<{ claimGroceryJob: Created | null }>(
    world,
    'device',
    `mutation { claimGroceryJob { id } }`,
  );

  return expectPresent(claimGroceryJob, 'the claimed run').id;
};

export const reportBug = async (world: Caller, index: number): Promise<string> => {
  const { reportBug: bug } = await call<{ reportBug: Created }>(
    world,
    'reader',
    `mutation ($i: ReportBugInput!) { reportBug(input: $i) { id } }`,
    { i: { severity: 'ANNOYING', message: `The page ${index} is slow to open`, context: CONTEXT } },
  );

  return bug.id;
};

export const requestImprovement = async (world: Caller, index: number): Promise<string> => {
  const { requestImprovement: idea } = await call<{ requestImprovement: Created }>(
    world,
    'reader',
    `mutation ($i: RequestImprovementInput!) { requestImprovement(input: $i) { id } }`,
    {
      i: {
        importance: 'WOULD_HELP',
        message: `Idea number ${index} for the app`,
        context: CONTEXT,
      },
    },
  );

  return idea.id;
};

/** The whole world the budget tests run in: an admin, a reader with data, a paired browser. */
export const buildWorld = async (api: TestApp): Promise<World> => {
  await api.reset();
  const admin = await api.signUp(ADMIN_EMAIL, PASSWORD);
  const reader = await api.signUp(READER_EMAIL, PASSWORD);
  const base = { api, cookies: { reader, admin }, deviceToken: '' };

  const seeded = await seedReader(base);

  const paired = await call<{ pairGroceryDevice: { token: string } }>(
    base,
    'reader',
    `mutation { pairGroceryDevice(label: "Desktop") { token } }`,
  );
  const world = { ...base, deviceToken: paired.pairGroceryDevice.token };

  await call(
    world,
    'reader',
    `mutation ($i: GroceryPreferenceInput!) { saveGroceryPreference(input: $i) { alertThresholdCents } }`,
    { i: { alertThresholdCents: 20_000 } },
  );
  await call(
    world,
    'reader',
    `mutation ($i: GrocerySlotWindowsInput!) { saveGrocerySlotWindows(input: $i) { weekday } }`,
    {
      i: {
        windows: [1, 2, 3, 4, 5].map((weekday): object => ({
          weekday,
          startMinute: 1080,
          endMinute: 1260,
        })),
      },
    },
  );

  await repeat(SEED.jobs, async (): Promise<void> => {
    await queueJob(world);
  });
  const runningJob = await claimJob(world);

  let bugReport = '';
  let improvement = '';
  await repeat(SEED.reports, async (index): Promise<void> => {
    bugReport = await reportBug(world, index);
    improvement = await requestImprovement(world, index);
  });

  return {
    api,
    cookies: { reader, admin },
    deviceToken: world.deviceToken,
    ids: {
      food: seeded.foodIds[0] ?? '',
      recipe: seeded.recipeIds[0] ?? '',
      weight: seeded.weightId,
      member: seeded.memberId,
      runningJob,
      bugReport,
      improvement,
    },
    weekOf: weekOfIndex(0),
  };
};
