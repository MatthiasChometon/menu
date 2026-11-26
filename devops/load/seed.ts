import { fail } from 'k6';
import { gql, rest, sessionCookieOf } from './http.ts';
import type { Session } from './http.ts';
import {
  CONTEXT,
  MEASUREMENTS,
  SEED,
  dayOfIndex,
  foodInput,
  memberInput,
  needs,
  recipeInput,
  weekOfIndex,
  weekPlanInput,
} from './fixtures.ts';

// The accounts are opened and verified by `prepare.sh` (a verification link is only ever mailed,
// and nothing here reads a mailbox). These values must match that script.
export const PASSWORD = __ENV['LOAD_PASSWORD'] ?? 'a-long-enough-password';
export const ADMIN_EMAIL = 'admin@load.example';
export const READER_EMAIL = 'reader@load.example';
export const CLAIMER_EMAIL = 'claimer@load.example';
export const FINISHER_EMAIL = 'finisher@load.example';
export const REPORTER_EMAIL = 'reporter@load.example';
export const disposableEmail = (index: number): string => `disposable-${index}@load.example`;

/** Rows the operations that read, update or delete one thing aim at. */
export type Ids = {
  food: string;
  recipe: string;
  weight: string;
  member: string;
  bugReport: string;
  improvement: string;
  /** A run the reader's own browser holds, which reads look at. */
  runningJob: string;
  /** A run held by the reporter's browser, which the events are appended to. */
  reporterJob: string;
};

/**
 * Who the virtual users are. The claimer and the finisher own their runs so the two operations
 * that take and close a run never race for the same one; the reporter owns the run the events
 * pile up on, so they never lengthen what the reads return.
 */
export type Data = {
  reader: Session;
  admin: Session;
  claimer: Session;
  finisher: Session;
  reporter: Session;
  ids: Ids;
  weekOf: string;
};

export const login = (email: string, password: string = PASSWORD): Session => {
  const answer = rest('prep', 'POST', '/auth/login', [200], { body: { email, password } });
  const cookie = sessionCookieOf(answer);
  if (cookie === '') fail(`Signing in as ${email} failed (${answer.status}): was prepare.sh run?`);

  return { cookie, deviceToken: '' };
};

const text = (data: Record<string, unknown> | undefined, field: string, key: string): string => {
  const value = (data?.[field] as Record<string, unknown> | undefined)?.[key];
  if (typeof value !== 'string') fail(`${field}.${key} is missing from a seeding answer`);

  return value;
};

const create = (
  session: Session,
  field: string,
  document: string,
  input: object,
  key = 'id',
): string => text(gql('prep', 'reader', session, document, { i: input }), field, key);

/** Pairs the person's browser, the way the extension does, and keeps its token. */
export const pair = (session: Session, label: string): Session => {
  const data = gql(
    'prep',
    'reader',
    session,
    `mutation ($label: String!) { pairGroceryDevice(label: $label) { token } }`,
    { label },
  );

  return { ...session, deviceToken: text(data, 'pairGroceryDevice', 'token') };
};

const SAVE_PREFERENCE = `mutation ($i: GroceryPreferenceInput!) { saveGroceryPreference(input: $i) { alertThresholdCents } }`;
const SAVE_WINDOWS = `mutation ($i: GrocerySlotWindowsInput!) { saveGrocerySlotWindows(input: $i) { weekday } }`;
const QUEUE_JOB = `mutation ($i: CreateGroceryJobInput!) { createGroceryJob(input: $i) { id } }`;

export const queueJob = (session: Session): string =>
  create(session, 'createGroceryJob', QUEUE_JOB, { weekOf: weekOfIndex(1), needs: needs() });

export const claimJob = (session: Session): string => {
  const data = gql('prep', 'device', session, `mutation { claimGroceryJob { id } }`);

  return text(data, 'claimGroceryJob', 'id');
};

/** What every account that fills a grocery run needs before it can queue one. */
const prepareShopper = (session: Session): void => {
  gql('prep', 'reader', session, SAVE_PREFERENCE, { i: { alertThresholdCents: 20_000 } });
  gql('prep', 'reader', session, SAVE_WINDOWS, {
    i: {
      windows: [1, 2, 3, 4, 5].map((weekday): object => ({
        weekday,
        startMinute: 1080,
        endMinute: 1260,
      })),
    },
  });
};

const times = (count: number, work: (index: number) => void): void => {
  for (let index = 0; index < count; index += 1) work(index);
};

const seedReader = (reader: Session): Omit<Ids, 'bugReport' | 'improvement' | 'reporterJob'> => {
  gql(
    'prep',
    'reader',
    reader,
    `mutation ($i: MeasurementsInput!) { saveProfile(input: $i) { age } }`,
    {
      i: MEASUREMENTS,
    },
  );

  let food = '';
  times(SEED.foods, (index): void => {
    food = create(
      reader,
      'createCustomFood',
      `mutation ($i: CustomFoodInput!) { createCustomFood(input: $i) { id } }`,
      foodInput(index),
    );
  });
  let recipe = '';
  times(SEED.recipes, (index): void => {
    recipe = create(
      reader,
      'createCustomRecipe',
      `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`,
      recipeInput(index),
    );
  });
  let weight = '';
  times(SEED.weights, (index): void => {
    weight = create(
      reader,
      'addWeightEntry',
      `mutation ($i: WeightEntryInput!) { addWeightEntry(input: $i) { id } }`,
      { date: dayOfIndex(index), kg: 80 - index / 20 },
    );
  });
  times(SEED.weekPlans, (index): void => {
    gql(
      'prep',
      'reader',
      reader,
      `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`,
      { i: weekPlanInput(weekOfIndex(index)) },
    );
  });
  let member = '';
  times(SEED.members, (index): void => {
    member = create(
      reader,
      'addHouseholdMember',
      `mutation ($i: HouseholdMemberInput!) { addHouseholdMember(input: $i) { id } }`,
      memberInput(index),
    );
  });
  prepareShopper(reader);
  times(SEED.jobs, (): void => {
    queueJob(reader);
  });
  const runningJob = claimJob(reader);

  return { food, recipe, weight, member, runningJob };
};

/** Months of data in the reader's account, reports in the admin's inbox, a run per lane. */
export const seedWorld = (): Data => {
  const reader = pair(login(READER_EMAIL), 'Desktop');
  const admin = login(ADMIN_EMAIL);
  const claimer = pair(login(CLAIMER_EMAIL), 'Claimer');
  const finisher = pair(login(FINISHER_EMAIL), 'Finisher');
  const reporter = pair(login(REPORTER_EMAIL), 'Reporter');

  const seeded = seedReader(reader);
  [claimer, finisher, reporter].forEach(prepareShopper);

  let bugReport = '';
  let improvement = '';
  times(SEED.reports, (index): void => {
    bugReport = create(
      reader,
      'reportBug',
      `mutation ($i: ReportBugInput!) { reportBug(input: $i) { id } }`,
      { severity: 'ANNOYING', message: `The page ${index} is slow to open`, context: CONTEXT },
    );
    improvement = create(
      reader,
      'requestImprovement',
      `mutation ($i: RequestImprovementInput!) { requestImprovement(input: $i) { id } }`,
      { importance: 'WOULD_HELP', message: `Idea number ${index} for the app`, context: CONTEXT },
    );
  });

  queueJob(reporter);
  const reporterJob = claimJob(reporter);

  return {
    reader,
    admin,
    claimer,
    finisher,
    reporter,
    ids: { ...seeded, bugReport, improvement, reporterJob },
    weekOf: weekOfIndex(0),
  };
};
