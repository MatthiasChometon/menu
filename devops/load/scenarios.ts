import exec from 'k6/execution';
import http from 'k6/http';
import { OPERATION_NAMES } from './budgets.ts';
import type { OperationName } from './budgets.ts';
import {
  CONTEXT,
  MEASUREMENTS,
  dayOfIndex,
  foodInput,
  memberInput,
  needs,
  outcome,
  recipeInput,
  unique,
  weekOfIndex,
  weekPlanInput,
} from './fixtures.ts';
import { gql, rest } from './http.ts';
import type { Who } from './http.ts';
import { PASSWORD, READER_EMAIL, claimJob, disposableEmail, login, queueJob } from './seed.ts';
import type { Data } from './seed.ts';

const PHOTO = open('./photo.jpg', 'b');

export type Scenario = (data: Data) => void;

const sessionOf = (data: Data, who: Who): Data['reader'] => {
  if (who === 'admin') return data.admin;

  return data.reader;
};

const read =
  (name: OperationName, who: Who, selection: string): Scenario =>
  (data): void => {
    gql(name, who, sessionOf(data, who), `query { ${selection} }`);
  };

const mutate =
  (
    name: OperationName,
    who: Who,
    document: string,
    variables: (data: Data) => object | undefined,
  ): Scenario =>
  (data): void => {
    gql(name, who, sessionOf(data, who), document, variables(data));
  };

const idOf = (answer: Record<string, unknown> | undefined, field: string): string => {
  const value = (answer?.[field] as { id?: string } | undefined)?.id;

  return value ?? '';
};

// What a judged call consumes, built on the side and never timed against a budget.
const prepare = (data: Data, document: string, field: string, input: object): string =>
  idOf(gql('prep', 'reader', data.reader, document, { i: input }), field);

const discard = (data: Data, document: string, variables: object): void => {
  gql('prep', 'reader', data.reader, document, variables);
};

const CREATE_FOOD = `mutation ($i: CustomFoodInput!) { createCustomFood(input: $i) { id } }`;
const CREATE_RECIPE = `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`;
const ADD_WEIGHT = `mutation ($i: WeightEntryInput!) { addWeightEntry(input: $i) { id } }`;
const ADD_MEMBER = `mutation ($i: HouseholdMemberInput!) { addHouseholdMember(input: $i) { id } }`;
const SAVE_WEEK = `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`;
const PAIR = `mutation { pairGroceryDevice(label: "Tablet") { device { id } } }`;
const SUBSCRIBE = `mutation ($i: PushSubscriptionInput!) { subscribeToGroceryPush(input: $i) }`;

const uuid = (): string =>
  `${exec.vu.idInTest}-${exec.scenario.iterationInInstance}-${Date.now()}-${unique()}`;

const hex = (length: number): string =>
  Array.from({ length }, (): string => Math.floor(Math.random() * 16).toString(16)).join('');

// A version 4 identifier, for the fields the API validates as one.
const uuidV4 = (): string =>
  `${hex(8)}-${hex(4)}-4${hex(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)] ?? '8'}${hex(3)}-${hex(12)}`;

const subscriptionInput = (endpoint: string): object => ({
  endpoint,
  p256dh: 'p256dh-key',
  auth: 'auth-key',
});

const flip = (values: string[]): string => values[unique() % values.length] ?? values[0] ?? '';

const call = (data: Data, name: OperationName, document: string, input?: object): void => {
  gql(name, 'reader', data.reader, document, input);
};

// The scenarios, one per operation of the API, named as `budgets.ts` names them. The seeded
// world is what they read; what they create they take back, so the data stays the size a long
// run started with.
export const SCENARIOS: Record<OperationName, Scenario> = {
  // GraphQL queries
  bugReports: read(
    'bugReports',
    'admin',
    'bugReports { id message severity status reportedBy reporterBlocked }',
  ),
  googleEnabled: read('googleEnabled', 'anonymous', 'googleEnabled'),
  groceryJob: (data): void => {
    call(
      data,
      'groceryJob',
      `query ($id: ID!) { groceryJob(jobId: $id) { id status lines { foodId grams units } events { kind at } } }`,
      { id: data.ids.runningJob },
    );
  },
  groceryPushKey: read('groceryPushKey', 'anonymous', 'groceryPushKey'),
  householdMembers: read(
    'householdMembers',
    'reader',
    'householdMembers { id name targets { kcal protein } }',
  ),
  improvementRequests: read(
    'improvementRequests',
    'admin',
    'improvementRequests { id message importance status }',
  ),
  me: read('me', 'reader', 'me { id email name hasPassword }'),
  myCustomFoods: read('myCustomFoods', 'reader', 'myCustomFoods { id name kcal pricePerKg }'),
  myCustomRecipes: read(
    'myCustomRecipes',
    'reader',
    'myCustomRecipes { id name slot ingredients { foodId grams } steps }',
  ),
  myGroceryDevices: read(
    'myGroceryDevices',
    'reader',
    'myGroceryDevices { id label pairedAt lastSeenAt }',
  ),
  myGroceryJobs: read(
    'myGroceryJobs',
    'reader',
    'myGroceryJobs { id status weekOf lines { foodId grams } events { kind } }',
  ),
  myGroceryPreference: read(
    'myGroceryPreference',
    'reader',
    'myGroceryPreference { alertThresholdCents }',
  ),
  myGrocerySlotWindows: read(
    'myGrocerySlotWindows',
    'reader',
    'myGrocerySlotWindows { weekday startMinute endMinute }',
  ),
  myProfile: read(
    'myProfile',
    'reader',
    'myProfile { age targets { kcal protein fat carbs fiber } }',
  ),
  myWeekPlan: (data): void => {
    call(
      data,
      'myWeekPlan',
      `query ($weekOf: String!) { myWeekPlan(weekOf: $weekOf) { weekOf days { day meals { slot recipeId } } } }`,
      { weekOf: data.weekOf },
    );
  },
  myWeekPlans: read(
    'myWeekPlans',
    'reader',
    'myWeekPlans { weekOf updatedAt days { day meals { slot recipeId } } }',
  ),
  myWeightEntries: read('myWeightEntries', 'reader', 'myWeightEntries { id date kg }'),
  nutritionTargets: (data): void => {
    gql(
      'nutritionTargets',
      'anonymous',
      data.reader,
      `query ($i: MeasurementsInput!) { nutritionTargets(input: $i) { kcal protein fat carbs fiber } }`,
      { i: MEASUREMENTS },
    );
  },

  // GraphQL mutations
  addHouseholdMember: (data): void => {
    const input = memberInput(unique());
    const id = idOf(
      gql('addHouseholdMember', 'reader', data.reader, ADD_MEMBER, { i: input }),
      'addHouseholdMember',
    );
    discard(data, `mutation ($id: ID!) { removeHouseholdMember(id: $id) }`, { id });
  },
  addWeightEntry: (data): void => {
    const input = { date: dayOfIndex(unique() % 3000), kg: 79.5 };
    const id = idOf(
      gql('addWeightEntry', 'reader', data.reader, ADD_WEIGHT, { i: input }),
      'addWeightEntry',
    );
    discard(data, `mutation ($id: ID!) { deleteWeightEntry(id: $id) }`, { id });
  },
  adjustNutritionTargets: (data): void => {
    call(
      data,
      'adjustNutritionTargets',
      `mutation ($deltaKcal: Int!) { adjustNutritionTargets(deltaKcal: $deltaKcal) { age } }`,
      { deltaKcal: unique() % 2 === 0 ? 50 : -50 },
    );
  },
  blockAccount: mutate(
    'blockAccount',
    'admin',
    `mutation ($i: BlockReporterInput!) { blockAccount(input: $i) }`,
    (data): object => ({ i: { reportId: data.ids.bugReport, blocked: false } }),
  ),
  claimGroceryJob: (data): void => {
    queueJob(data.claimer);
    const answer = gql(
      'claimGroceryJob',
      'device',
      data.claimer,
      `mutation { claimGroceryJob { id status } }`,
    );
    const id = idOf(answer, 'claimGroceryJob');
    // The run is closed again, or the lane would pile up runs nobody is going to finish.
    if (id !== '') {
      gql(
        'prep',
        'device',
        data.claimer,
        `mutation ($jobId: ID!, $i: GroceryJobOutcomeInput!) { finishGroceryJob(jobId: $jobId, input: $i) { id } }`,
        { jobId: id, i: outcome() },
      );
    }
  },
  createCustomFood: (data): void => {
    const answer = gql('createCustomFood', 'reader', data.reader, CREATE_FOOD, {
      i: foodInput(3000 + unique()),
    });
    discard(data, `mutation ($id: ID!) { deleteCustomFood(id: $id) }`, {
      id: idOf(answer, 'createCustomFood'),
    });
  },
  createCustomRecipe: (data): void => {
    const answer = gql('createCustomRecipe', 'reader', data.reader, CREATE_RECIPE, {
      i: recipeInput(3000 + unique()),
    });
    discard(data, `mutation ($id: ID!) { deleteCustomRecipe(id: $id) }`, {
      id: idOf(answer, 'createCustomRecipe'),
    });
  },
  createGroceryJob: (data): void => {
    gql(
      'createGroceryJob',
      'reader',
      data.claimer,
      `mutation ($i: CreateGroceryJobInput!) { createGroceryJob(input: $i) { id } }`,
      { i: { weekOf: weekOfIndex(1), needs: needs() } },
    );
  },
  deleteCustomFood: (data): void => {
    const id = prepare(data, CREATE_FOOD, 'createCustomFood', foodInput(4000 + unique()));
    call(data, 'deleteCustomFood', `mutation ($id: ID!) { deleteCustomFood(id: $id) }`, { id });
  },
  deleteCustomRecipe: (data): void => {
    const id = prepare(data, CREATE_RECIPE, 'createCustomRecipe', recipeInput(4000 + unique()));
    call(data, 'deleteCustomRecipe', `mutation ($id: ID!) { deleteCustomRecipe(id: $id) }`, { id });
  },
  deleteWeekPlan: (data): void => {
    const weekOf = weekOfIndex(100 + unique());
    gql('prep', 'reader', data.reader, SAVE_WEEK, { i: weekPlanInput(weekOf) });
    call(
      data,
      'deleteWeekPlan',
      `mutation ($weekOf: String!) { deleteWeekPlan(weekOf: $weekOf) }`,
      {
        weekOf,
      },
    );
  },
  deleteWeightEntry: (data): void => {
    const id = prepare(data, ADD_WEIGHT, 'addWeightEntry', {
      date: dayOfIndex(unique() % 3000),
      kg: 79,
    });
    call(data, 'deleteWeightEntry', `mutation ($id: ID!) { deleteWeightEntry(id: $id) }`, { id });
  },
  finishGroceryJob: (data): void => {
    queueJob(data.finisher);
    // The browser takes the oldest waiting run: the id it was handed is the one to close.
    const jobId = claimJob(data.finisher);
    gql(
      'finishGroceryJob',
      'device',
      data.finisher,
      `mutation ($jobId: ID!, $i: GroceryJobOutcomeInput!) { finishGroceryJob(jobId: $jobId, input: $i) { id status } }`,
      { jobId, i: outcome() },
    );
  },
  pairGroceryDevice: (data): void => {
    const answer = gql(
      'pairGroceryDevice',
      'reader',
      data.reader,
      `mutation { pairGroceryDevice(label: "Phone") { device { id } token } }`,
    );
    const deviceId = (answer?.['pairGroceryDevice'] as { device?: { id?: string } } | undefined)
      ?.device?.id;
    discard(data, `mutation ($deviceId: ID!) { unpairGroceryDevice(deviceId: $deviceId) }`, {
      deviceId: deviceId ?? '',
    });
  },
  removeHouseholdMember: (data): void => {
    const id = prepare(data, ADD_MEMBER, 'addHouseholdMember', memberInput(4000 + unique()));
    call(data, 'removeHouseholdMember', `mutation ($id: ID!) { removeHouseholdMember(id: $id) }`, {
      id,
    });
  },
  reportBug: (data): void => {
    call(data, 'reportBug', `mutation ($i: ReportBugInput!) { reportBug(input: $i) { id } }`, {
      i: { severity: 'COSMETIC', message: `The button ${uuid()} is misaligned`, context: CONTEXT },
    });
  },
  reportCarrefourSession: (data): void => {
    gql(
      'reportCarrefourSession',
      'device',
      data.reader,
      `mutation ($signedIn: Boolean!) { reportCarrefourSession(signedIn: $signedIn) }`,
      { signedIn: unique() % 2 === 0 },
    );
  },
  reportGroceryJobEvent: (data): void => {
    gql(
      'reportGroceryJobEvent',
      'device',
      data.reporter,
      `mutation ($jobId: ID!, $i: GroceryJobEventInput!) { reportGroceryJobEvent(jobId: $jobId, input: $i) { id kind } }`,
      {
        jobId: data.ids.reporterJob,
        i: { eventId: uuidV4(), kind: 'LINE_ADDED', foodId: 'brownRice', label: 'Brown rice' },
      },
    );
  },
  requestImprovement: (data): void => {
    call(
      data,
      'requestImprovement',
      `mutation ($i: RequestImprovementInput!) { requestImprovement(input: $i) { id } }`,
      {
        i: {
          importance: 'NICE_TO_HAVE',
          message: `Idea ${uuid()} for the week page`,
          context: CONTEXT,
        },
      },
    );
  },
  saveGroceryPreference: (data): void => {
    call(
      data,
      'saveGroceryPreference',
      `mutation ($i: GroceryPreferenceInput!) { saveGroceryPreference(input: $i) { alertThresholdCents } }`,
      { i: { alertThresholdCents: 10_000 + unique() } },
    );
  },
  saveGrocerySlotWindows: (data): void => {
    call(
      data,
      'saveGrocerySlotWindows',
      `mutation ($i: GrocerySlotWindowsInput!) { saveGrocerySlotWindows(input: $i) { weekday } }`,
      { i: { windows: [{ weekday: 1 + (unique() % 7), startMinute: 1080, endMinute: 1260 }] } },
    );
  },
  saveProfile: (data): void => {
    call(
      data,
      'saveProfile',
      `mutation ($i: MeasurementsInput!) { saveProfile(input: $i) { age } }`,
      { i: { ...MEASUREMENTS, age: 25 + (unique() % 10) } },
    );
  },
  saveWeekPlan: (data): void => {
    call(data, 'saveWeekPlan', SAVE_WEEK, { i: weekPlanInput(data.weekOf) });
  },
  setBugStatus: mutate(
    'setBugStatus',
    'admin',
    `mutation ($i: BugStatusInput!) { setBugStatus(input: $i) { id status } }`,
    (data): object => ({
      i: { id: data.ids.bugReport, status: flip(['FIXED', 'NEW', 'DISMISSED']) },
    }),
  ),
  setImprovementStatus: mutate(
    'setImprovementStatus',
    'admin',
    `mutation ($i: ImprovementStatusInput!) { setImprovementStatus(input: $i) { id status } }`,
    (data): object => ({
      i: { id: data.ids.improvement, status: flip(['PLANNED', 'NEW', 'DONE']) },
    }),
  ),
  subscribeToGroceryPush: (data): void => {
    const endpoint = `https://push.example.test/${uuid()}`;
    call(data, 'subscribeToGroceryPush', SUBSCRIBE, { i: subscriptionInput(endpoint) });
    discard(
      data,
      `mutation ($endpoint: String!) { unsubscribeFromGroceryPush(endpoint: $endpoint) }`,
      {
        endpoint,
      },
    );
  },
  unpairGroceryDevice: (data): void => {
    const answer = gql('prep', 'reader', data.reader, PAIR);
    const deviceId = (answer?.['pairGroceryDevice'] as { device?: { id?: string } } | undefined)
      ?.device?.id;
    call(
      data,
      'unpairGroceryDevice',
      `mutation ($deviceId: ID!) { unpairGroceryDevice(deviceId: $deviceId) }`,
      {
        deviceId: deviceId ?? '',
      },
    );
  },
  unsubscribeFromGroceryPush: (data): void => {
    const endpoint = `https://push.example.test/${uuid()}`;
    gql('prep', 'reader', data.reader, SUBSCRIBE, { i: subscriptionInput(endpoint) });
    call(
      data,
      'unsubscribeFromGroceryPush',
      `mutation ($endpoint: String!) { unsubscribeFromGroceryPush(endpoint: $endpoint) }`,
      { endpoint },
    );
  },
  updateCustomFood: (data): void => {
    call(
      data,
      'updateCustomFood',
      `mutation ($i: UpdateCustomFoodInput!) { updateCustomFood(input: $i) { id } }`,
      { i: { id: data.ids.food, ...foodInput(unique()) } },
    );
  },
  updateCustomRecipe: (data): void => {
    call(
      data,
      'updateCustomRecipe',
      `mutation ($i: UpdateCustomRecipeInput!) { updateCustomRecipe(input: $i) { id } }`,
      { i: { id: data.ids.recipe, ...recipeInput(unique()) } },
    );
  },
  updateHouseholdMember: (data): void => {
    call(
      data,
      'updateHouseholdMember',
      `mutation ($i: UpdateHouseholdMemberInput!) { updateHouseholdMember(input: $i) { id } }`,
      { i: { id: data.ids.member, ...memberInput(unique()) } },
    );
  },
  updateWeightEntry: (data): void => {
    call(
      data,
      'updateWeightEntry',
      `mutation ($i: UpdateWeightEntryInput!) { updateWeightEntry(input: $i) { id } }`,
      { i: { id: data.ids.weight, date: dayOfIndex(119), kg: 70 + (unique() % 5) } },
    );
  },

  // REST routes. The Google ones are redirects the browser follows: only the first answer is
  // the API's to time.
  health: (): void => {
    rest('health', 'GET', '/health', [200]);
  },
  healthReady: (): void => {
    rest('healthReady', 'GET', '/health/ready', [200]);
  },
  googleStart: (): void => {
    rest('googleStart', 'GET', '/auth/google', [302]);
  },
  googleCallback: (): void => {
    rest('googleCallback', 'GET', '/auth/google/callback', [401]);
  },
  login: (): void => {
    rest('login', 'POST', '/auth/login', [200], {
      body: { email: READER_EMAIL, password: PASSWORD },
    });
  },
  register: (): void => {
    rest('register', 'POST', '/auth/register', [202], {
      body: { email: `new-${uuid()}@load.example`, password: PASSWORD },
    });
  },
  logout: (data): void => {
    rest('logout', 'POST', '/auth/logout', [204], {
      who: 'reader',
      session: data.reader,
      body: {},
    });
  },
  verifyEmail: (): void => {
    rest('verifyEmail', 'POST', '/auth/verify-email', [401], { body: { token: 'a'.repeat(64) } });
  },
  resendVerification: (): void => {
    rest('resendVerification', 'POST', '/auth/resend-verification', [204], {
      body: { email: READER_EMAIL },
    });
  },
  forgotPassword: (): void => {
    rest('forgotPassword', 'POST', '/auth/forgot-password', [204], {
      body: { email: READER_EMAIL },
    });
  },
  resetPassword: (): void => {
    rest('resetPassword', 'POST', '/auth/reset-password', [401], {
      body: { token: 'a'.repeat(64), password: PASSWORD },
    });
  },
  deleteAccount: (): void => {
    // `prepare.sh` opened a pool of accounts, one per call: an account can only be deleted once.
    const session = login(disposableEmail(exec.scenario.iterationInInstance + 1));
    rest('deleteAccount', 'POST', '/auth/delete-account', [204], {
      who: 'reader',
      session,
      body: { password: PASSWORD },
    });
  },
  uploadImage: (data): void => {
    rest('uploadImage', 'POST', `/images/recipe/load${unique()}x${Date.now()}`, [201], {
      who: 'admin',
      session: data.admin,
      form: true,
      body: { file: http.file(PHOTO, 'photo.jpg', 'image/jpeg') },
    });
  },
};

/** How often each operation is played in the mixed profiles, as a person would. */
const WEIGHT: Partial<Record<OperationName, number>> = {
  me: 10,
  myProfile: 8,
  myWeekPlan: 8,
  myWeekPlans: 4,
  myCustomFoods: 5,
  myCustomRecipes: 5,
  myWeightEntries: 4,
  householdMembers: 3,
  nutritionTargets: 3,
  saveWeekPlan: 3,
  addWeightEntry: 2,
  login: 1,
  register: 0.2,
  uploadImage: 0.1,
  health: 1,
  healthReady: 1,
};

/**
 * Operations that two virtual users would race on if they played together: they are played by
 * one virtual user in their own scenario, and left out of the mixed profiles.
 */
export const SERIAL: OperationName[] = [
  'addHouseholdMember',
  'claimGroceryJob',
  'deleteAccount',
  'finishGroceryJob',
];

export const weightOf = (name: OperationName): number => WEIGHT[name] ?? 1;

const MIXED = OPERATION_NAMES.filter((name): boolean => !SERIAL.includes(name));
const TOTAL_WEIGHT = MIXED.reduce((sum, name): number => sum + weightOf(name), 0);

/** One operation drawn at random, the likelier the more often a person does it. */
export const drawOperation = (): OperationName => {
  let ticket = Math.random() * TOTAL_WEIGHT;
  for (const name of MIXED) {
    ticket -= weightOf(name);
    if (ticket <= 0) return name;
  }

  return 'me';
};
