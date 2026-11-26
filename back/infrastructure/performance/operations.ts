import { randomUUID } from 'node:crypto';
import { BUDGET_MS } from '../testing/time-budget';
import {
  call,
  claimJob,
  CONTEXT,
  dayOfIndex,
  foodInput,
  memberInput,
  MEASUREMENTS,
  needs,
  outcome,
  queueJob,
  recipeInput,
  weekOfIndex,
  weekPlanInput,
  type Who,
  type World,
} from './world';

/** One thing a caller can ask of the API, and how fast it has to answer. */
export type Operation = {
  name: string;
  budget: keyof typeof BUDGET_MS;
  /** Builds what one call consumes (a row to delete, a run to close). Not timed. */
  prepare: (world: World) => Promise<string>;
  /** The timed call. */
  run: (world: World, prepared: string) => Promise<void>;
};

const nothing = (): Promise<string> => Promise.resolve('');

let counter = 0;
const fresh = (): number => {
  counter += 1;

  return counter;
};

type Variables = (world: World, prepared: string) => object | undefined;

const graphql = (
  name: string,
  who: Who,
  document: string,
  variables: Variables = (): undefined => undefined,
  prepare: Operation['prepare'] = nothing,
): Operation => ({
  name,
  budget: document.trimStart().startsWith('mutation') ? 'mutation' : 'read',
  prepare,
  run: async (world, prepared): Promise<void> => {
    await call(world, who, document, variables(world, prepared));
  },
});

const query = (name: string, who: Who, selection: string, variables?: Variables): Operation =>
  graphql(name, who, `query { ${selection} }`, variables);

const foodsOfReader = ['brownRice', 'oats', 'chicken'];

// Every GraphQL query of the schema.
export const QUERIES: Operation[] = [
  query('amIAdmin', 'admin', 'amIAdmin'),
  query(
    'bugReports',
    'admin',
    'bugReports { id message severity status reportedBy reporterBlocked }',
  ),
  query('googleEnabled', 'anonymous', 'googleEnabled'),
  graphql(
    'groceryJob',
    'reader',
    `
      query ($id: ID!) {
        groceryJob(jobId: $id) {
          id
          status
          lines {
            foodId
            grams
            units
          }
          events {
            kind
            at
          }
        }
      }
    `,
    (world): object => ({ id: world.ids.runningJob }),
  ),
  query('groceryPushKey', 'anonymous', 'groceryPushKey'),
  query('householdMembers', 'reader', 'householdMembers { id name targets { kcal protein } }'),
  query('improvementRequests', 'admin', 'improvementRequests { id message importance status }'),
  query('me', 'reader', 'me { id email name hasPassword }'),
  query('myCustomFoods', 'reader', 'myCustomFoods { id name kcal pricePerKg }'),
  query(
    'myCustomRecipes',
    'reader',
    'myCustomRecipes { id name slot ingredients { foodId grams } steps }',
  ),
  query('myGroceryDevices', 'reader', 'myGroceryDevices { id label pairedAt lastSeenAt }'),
  query(
    'myGroceryJobs',
    'reader',
    'myGroceryJobs { id status weekOf lines { foodId grams } events { kind } }',
  ),
  query('myGroceryPreference', 'reader', 'myGroceryPreference { alertThresholdCents }'),
  query('myGrocerySlotWindows', 'reader', 'myGrocerySlotWindows { weekday startMinute endMinute }'),
  query('myProfile', 'reader', 'myProfile { age targets { kcal protein fat carbs fiber } }'),
  graphql(
    'myWeekPlan',
    'reader',
    `
      query ($weekOf: String!) {
        myWeekPlan(weekOf: $weekOf) {
          weekOf
          days {
            day
            meals {
              slot
              recipeId
            }
          }
        }
      }
    `,
    (world): object => ({ weekOf: world.weekOf }),
  ),
  query(
    'myWeekPlans',
    'reader',
    'myWeekPlans { weekOf updatedAt days { day meals { slot recipeId } } }',
  ),
  query('myWeightEntries', 'reader', 'myWeightEntries { id date kg }'),
  graphql(
    'nutritionTargets',
    'anonymous',
    `
      query ($i: MeasurementsInput!) {
        nutritionTargets(input: $i) {
          kcal
          protein
          fat
          carbs
          fiber
        }
      }
    `,
    (): object => ({ i: MEASUREMENTS }),
  ),
];

const createdId = async (
  world: World,
  document: string,
  field: string,
  variables: object,
): Promise<string> => {
  const data = await call<Record<string, { id: string }>>(world, 'reader', document, variables);

  return data[field]?.id ?? '';
};

const createFood = (world: World): Promise<string> =>
  createdId(
    world,
    `mutation ($i: CustomFoodInput!) { createCustomFood(input: $i) { id } }`,
    'createCustomFood',
    { i: foodInput(1000 + fresh()) },
  );

const createRecipe = (world: World): Promise<string> =>
  createdId(
    world,
    `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`,
    'createCustomRecipe',
    { i: recipeInput(1000 + fresh(), foodsOfReader) },
  );

const addWeight = (world: World): Promise<string> =>
  createdId(
    world,
    `mutation ($i: WeightEntryInput!) { addWeightEntry(input: $i) { id } }`,
    'addWeightEntry',
    { i: { date: dayOfIndex(1000 + fresh()), kg: 79.5 } },
  );

const addMember = (world: World): Promise<string> =>
  createdId(
    world,
    `mutation ($i: HouseholdMemberInput!) { addHouseholdMember(input: $i) { id } }`,
    'addHouseholdMember',
    { i: memberInput(1000 + fresh()) },
  );

const pairDevice = async (world: World): Promise<string> => {
  const data = await call<{ pairGroceryDevice: { device: { id: string } } }>(
    world,
    'reader',
    `mutation { pairGroceryDevice(label: "Phone") { device { id } } }`,
  );

  return data.pairGroceryDevice.device.id;
};

const queueAndClaim = async (world: World): Promise<string> => {
  await queueJob(world);
  // The browser takes the oldest waiting run, which may be a seeded one: the id it was
  // handed is the one to close.
  return claimJob(world);
};

const planOf = async (world: World): Promise<string> => {
  const weekOf = weekOfIndex(100 + fresh());
  await call(
    world,
    'reader',
    `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`,
    {
      i: weekPlanInput(weekOf, ['brownRice']),
    },
  );

  return weekOf;
};

const endpoint = (): string => `https://push.example.test/${randomUUID()}`;

let subscribed = '';

const flip = (values: string[]): string => values[fresh() % values.length] ?? 'NEW';

// The household is capped, so the member this adds is taken back before the next call.
let lastMember = '';
const addHouseholdMemberOperation: Operation = {
  name: 'addHouseholdMember',
  budget: 'mutation',
  prepare: async (world): Promise<string> => {
    if (lastMember !== '') {
      await call(world, 'reader', `mutation ($id: ID!) { removeHouseholdMember(id: $id) }`, {
        id: lastMember,
      });
    }
    lastMember = '';

    return '';
  },
  run: async (world): Promise<void> => {
    lastMember = await addMember(world);
  },
};

// Every GraphQL mutation of the schema.
export const MUTATIONS: Operation[] = [
  addHouseholdMemberOperation,
  graphql(
    'addWeightEntry',
    'reader',
    `
      mutation ($i: WeightEntryInput!) {
        addWeightEntry(input: $i) {
          id
        }
      }
    `,
    (): object => ({ i: { date: dayOfIndex(2000 + fresh()), kg: 79.5 } }),
  ),
  graphql(
    'adjustNutritionTargets',
    'reader',
    `
      mutation ($deltaKcal: Int!) {
        adjustNutritionTargets(deltaKcal: $deltaKcal) {
          age
        }
      }
    `,
    (): object => ({ deltaKcal: fresh() % 2 === 0 ? 50 : -50 }),
  ),
  graphql(
    'blockAccount',
    'admin',
    `
      mutation ($i: BlockReporterInput!) {
        blockAccount(input: $i)
      }
    `,
    (world): object => ({ i: { reportId: world.ids.bugReport, blocked: false } }),
  ),
  graphql(
    'claimGroceryJob',
    'device',
    `
      mutation {
        claimGroceryJob {
          id
          status
        }
      }
    `,
    undefined,
    async (world) => {
      await queueJob(world);

      return '';
    },
  ),
  graphql(
    'createCustomFood',
    'reader',
    `
      mutation ($i: CustomFoodInput!) {
        createCustomFood(input: $i) {
          id
        }
      }
    `,
    (): object => ({ i: foodInput(3000 + fresh()) }),
  ),
  graphql(
    'createCustomRecipe',
    'reader',
    `
      mutation ($i: CustomRecipeInput!) {
        createCustomRecipe(input: $i) {
          id
        }
      }
    `,
    (): object => ({ i: recipeInput(3000 + fresh(), foodsOfReader) }),
  ),
  graphql(
    'createGroceryJob',
    'reader',
    `
      mutation ($i: CreateGroceryJobInput!) {
        createGroceryJob(input: $i) {
          id
        }
      }
    `,
    (): object => ({ i: { weekOf: weekOfIndex(1), needs: needs() } }),
  ),
  graphql(
    'deleteCustomFood',
    'reader',
    `
      mutation ($id: ID!) {
        deleteCustomFood(id: $id)
      }
    `,
    (_world, id): object => ({ id }),
    createFood,
  ),
  graphql(
    'deleteCustomRecipe',
    'reader',
    `
      mutation ($id: ID!) {
        deleteCustomRecipe(id: $id)
      }
    `,
    (_world, id): object => ({ id }),
    createRecipe,
  ),
  graphql(
    'deleteWeekPlan',
    'reader',
    `
      mutation ($weekOf: String!) {
        deleteWeekPlan(weekOf: $weekOf)
      }
    `,
    (_world, weekOf): object => ({ weekOf }),
    planOf,
  ),
  graphql(
    'deleteWeightEntry',
    'reader',
    `
      mutation ($id: ID!) {
        deleteWeightEntry(id: $id)
      }
    `,
    (_world, id): object => ({ id }),
    addWeight,
  ),
  graphql(
    'finishGroceryJob',
    'device',
    `
      mutation ($jobId: ID!, $i: GroceryJobOutcomeInput!) {
        finishGroceryJob(jobId: $jobId, input: $i) {
          id
          status
        }
      }
    `,
    (_world, jobId): object => ({ jobId, i: outcome() }),
    queueAndClaim,
  ),
  graphql(
    'pairGroceryDevice',
    'reader',
    `
      mutation {
        pairGroceryDevice(label: "Tablet") {
          token
        }
      }
    `,
  ),
  graphql(
    'removeHouseholdMember',
    'reader',
    `
      mutation ($id: ID!) {
        removeHouseholdMember(id: $id)
      }
    `,
    (_world, id): object => ({ id }),
    addMember,
  ),
  graphql(
    'reportBug',
    'reader',
    `
      mutation ($i: ReportBugInput!) {
        reportBug(input: $i) {
          id
        }
      }
    `,
    (): object => ({
      i: { severity: 'COSMETIC', message: `The button ${fresh()} is misaligned`, context: CONTEXT },
    }),
  ),
  graphql(
    'reportCarrefourSession',
    'device',
    `
      mutation ($signedIn: Boolean!) {
        reportCarrefourSession(signedIn: $signedIn)
      }
    `,
    (): object => ({ signedIn: fresh() % 2 === 0 }),
  ),
  graphql(
    'reportGroceryJobEvent',
    'device',
    `
      mutation ($jobId: ID!, $i: GroceryJobEventInput!) {
        reportGroceryJobEvent(jobId: $jobId, input: $i) {
          id
          kind
        }
      }
    `,
    (world): object => ({
      jobId: world.ids.runningJob,
      i: { eventId: randomUUID(), kind: 'LINE_ADDED', foodId: 'brownRice', label: 'Brown rice' },
    }),
  ),
  graphql(
    'requestImprovement',
    'reader',
    `
      mutation ($i: RequestImprovementInput!) {
        requestImprovement(input: $i) {
          id
        }
      }
    `,
    (): object => ({
      i: {
        importance: 'NICE_TO_HAVE',
        message: `Idea ${fresh()} for the week page`,
        context: CONTEXT,
      },
    }),
  ),
  graphql(
    'saveGroceryPreference',
    'reader',
    `
      mutation ($i: GroceryPreferenceInput!) {
        saveGroceryPreference(input: $i) {
          alertThresholdCents
        }
      }
    `,
    (): object => ({ i: { alertThresholdCents: 10_000 + fresh() } }),
  ),
  graphql(
    'saveGrocerySlotWindows',
    'reader',
    `
      mutation ($i: GrocerySlotWindowsInput!) {
        saveGrocerySlotWindows(input: $i) {
          weekday
        }
      }
    `,
    (): object => ({
      i: { windows: [{ weekday: 1 + (fresh() % 7), startMinute: 1080, endMinute: 1260 }] },
    }),
  ),
  graphql(
    'saveProfile',
    'reader',
    `
      mutation ($i: MeasurementsInput!) {
        saveProfile(input: $i) {
          age
        }
      }
    `,
    (): object => ({ i: { ...MEASUREMENTS, age: 25 + (fresh() % 10) } }),
  ),
  graphql(
    'saveWeekPlan',
    'reader',
    `
      mutation ($i: WeekPlanInput!) {
        saveWeekPlan(input: $i) {
          weekOf
        }
      }
    `,
    (world): object => ({ i: weekPlanInput(world.weekOf, ['brownRice', 'oats']) }),
  ),
  graphql(
    'setBugStatus',
    'admin',
    `
      mutation ($i: BugStatusInput!) {
        setBugStatus(input: $i) {
          id
          status
        }
      }
    `,
    (world): object => ({
      i: { id: world.ids.bugReport, status: flip(['FIXED', 'NEW', 'DISMISSED']) },
    }),
  ),
  graphql(
    'setImprovementStatus',
    'admin',
    `
      mutation ($i: ImprovementStatusInput!) {
        setImprovementStatus(input: $i) {
          id
          status
        }
      }
    `,
    (world): object => ({
      i: { id: world.ids.improvement, status: flip(['PLANNED', 'NEW', 'DONE']) },
    }),
  ),
  graphql(
    'subscribeToGroceryPush',
    'reader',
    `
      mutation ($i: PushSubscriptionInput!) {
        subscribeToGroceryPush(input: $i)
      }
    `,
    (): object => {
      subscribed = endpoint();

      return { i: { endpoint: subscribed, p256dh: 'p256dh-key', auth: 'auth-key' } };
    },
  ),
  graphql(
    'unpairGroceryDevice',
    'reader',
    `
      mutation ($deviceId: ID!) {
        unpairGroceryDevice(deviceId: $deviceId)
      }
    `,
    (_world, deviceId): object => ({ deviceId }),
    pairDevice,
  ),
  graphql(
    'unsubscribeFromGroceryPush',
    'reader',
    `
      mutation ($endpoint: String!) {
        unsubscribeFromGroceryPush(endpoint: $endpoint)
      }
    `,
    (): object => ({ endpoint: subscribed }),
    async (world): Promise<string> => {
      subscribed = endpoint();
      await call(
        world,
        'reader',
        `mutation ($i: PushSubscriptionInput!) { subscribeToGroceryPush(input: $i) }`,
        { i: { endpoint: subscribed, p256dh: 'p256dh-key', auth: 'auth-key' } },
      );

      return subscribed;
    },
  ),
  graphql(
    'updateCustomFood',
    'reader',
    `
      mutation ($i: UpdateCustomFoodInput!) {
        updateCustomFood(input: $i) {
          id
        }
      }
    `,
    (world): object => ({ i: { id: world.ids.food, ...foodInput(fresh()) } }),
  ),
  graphql(
    'updateCustomRecipe',
    'reader',
    `
      mutation ($i: UpdateCustomRecipeInput!) {
        updateCustomRecipe(input: $i) {
          id
        }
      }
    `,
    (world): object => ({ i: { id: world.ids.recipe, ...recipeInput(fresh(), foodsOfReader) } }),
  ),
  graphql(
    'updateHouseholdMember',
    'reader',
    `
      mutation ($i: UpdateHouseholdMemberInput!) {
        updateHouseholdMember(input: $i) {
          id
        }
      }
    `,
    (world): object => ({ i: { id: world.ids.member, ...memberInput(fresh()) } }),
  ),
  graphql(
    'updateWeightEntry',
    'reader',
    `
      mutation ($i: UpdateWeightEntryInput!) {
        updateWeightEntry(input: $i) {
          id
        }
      }
    `,
    (world): object => ({
      i: { id: world.ids.weight, date: dayOfIndex(119), kg: 70 + (fresh() % 5) },
    }),
  ),
];
