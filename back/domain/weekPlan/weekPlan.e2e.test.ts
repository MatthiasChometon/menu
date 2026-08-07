import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const PASSWORD = 'a-long-enough-password';
const WEEK = '2026-08-10';

const MONDAY = {
  day: 'MONDAY',
  meals: [
    { slot: 'BREAKFAST', recipeId: 'fullShaker' },
    { slot: 'LUNCH', recipeId: 'chiliChicken' },
    { slot: 'DINNER', recipeId: 'tunaPasta' },
  ],
};

const SAVE = `
  mutation ($input: WeekPlanInput!) {
    saveWeekPlan(input: $input) { weekOf updatedAt days { day meals { slot recipeId } } }
  }
`;

const MINE = `
  query ($weekOf: String!) {
    myWeekPlan(weekOf: $weekOf) { weekOf days { day meals { slot recipeId } } }
  }
`;

const ALL = `query { myWeekPlans { weekOf } }`;
const DELETE = `mutation ($weekOf: String!) { deleteWeekPlan(weekOf: $weekOf) }`;

type Plan = {
  weekOf: string;
  days: { day: string; meals: { slot: string; recipeId: string }[] }[];
};

let api: TestApp;

const signIn = async (email: string): Promise<string> => {
  const response = await api.post('/auth/register', { email, password: PASSWORD });
  const session = response.cookies.find((cookie): boolean => cookie.name === 'session');

  return `session=${session?.value}`;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('composing a week', () => {
  it('gives back nothing for a week never composed', async () => {
    const cookie = await signIn('matthias@example.com');

    const response = await api.graphql<{ myWeekPlan: null }>(MINE, { weekOf: WEEK }, cookie);

    expect(response.errors).toBeUndefined();
    expect(response.data?.myWeekPlan).toBeNull();
  });

  it('keeps the dishes chosen, and nothing else', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, cookie);
    const response = await api.graphql<{ myWeekPlan: Plan }>(MINE, { weekOf: WEEK }, cookie);

    expect(response.data?.myWeekPlan.weekOf).toBe(WEEK);
    expect(response.data?.myWeekPlan.days).toEqual([MONDAY]);
  });

  it('replaces a week wholesale rather than merging into it', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, cookie);
    // A dish removed by the reader must not survive the next save.
    const trimmed = { day: 'MONDAY', meals: [{ slot: 'LUNCH', recipeId: 'porkWok' }] };
    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [trimmed] } }, cookie);

    const response = await api.graphql<{ myWeekPlan: Plan }>(MINE, { weekOf: WEEK }, cookie);

    expect(response.data?.myWeekPlan.days).toEqual([trimmed]);
  });

  it('keeps each week apart from the others', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, cookie);
    await api.graphql(SAVE, { input: { weekOf: '2026-08-17', days: [] } }, cookie);

    const response = await api.graphql<{ myWeekPlans: { weekOf: string }[] }>(
      ALL,
      undefined,
      cookie,
    );

    expect(response.data?.myWeekPlans.map((plan): string => plan.weekOf)).toEqual([
      '2026-08-17',
      WEEK,
    ]);
  });

  it('forgets a week on request, and says when there was none', async () => {
    const cookie = await signIn('matthias@example.com');

    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, cookie);
    const removed = await api.graphql<{ deleteWeekPlan: boolean }>(
      DELETE,
      { weekOf: WEEK },
      cookie,
    );
    const again = await api.graphql<{ deleteWeekPlan: boolean }>(DELETE, { weekOf: WEEK }, cookie);

    expect(removed.data?.deleteWeekPlan).toBe(true);
    expect(again.data?.deleteWeekPlan).toBe(false);
  });
});

describe('whose week it is', () => {
  it('is refused to whoever is not signed in', async () => {
    const response = await api.graphql(MINE, { weekOf: WEEK });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('cannot be written without a session', async () => {
    const response = await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('stays invisible to another account', async () => {
    const mine = await signIn('matthias@example.com');
    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, mine);

    // The whole point of tying a week to its owner: two people, two weeks.
    const theirs = await signIn('someone-else@example.com');
    const response = await api.graphql<{ myWeekPlan: null }>(MINE, { weekOf: WEEK }, theirs);

    expect(response.data?.myWeekPlan).toBeNull();
  });

  it('lets two accounts hold different dishes for the same week', async () => {
    const mine = await signIn('matthias@example.com');
    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [MONDAY] } }, mine);

    const theirs = await signIn('someone-else@example.com');
    const otherDay = { day: 'MONDAY', meals: [{ slot: 'LUNCH', recipeId: 'salmonRiceBroccoli' }] };
    await api.graphql(SAVE, { input: { weekOf: WEEK, days: [otherDay] } }, theirs);

    const first = await api.graphql<{ myWeekPlan: Plan }>(MINE, { weekOf: WEEK }, mine);
    const second = await api.graphql<{ myWeekPlan: Plan }>(MINE, { weekOf: WEEK }, theirs);

    expect(first.data?.myWeekPlan.days).toEqual([MONDAY]);
    expect(second.data?.myWeekPlan.days).toEqual([otherDay]);
  });
});

describe('what the API refuses to store', () => {
  it('rejects a week that is not a date', async () => {
    const cookie = await signIn('matthias@example.com');

    const response = await api.graphql(
      SAVE,
      { input: { weekOf: 'la semaine prochaine', days: [] } },
      cookie,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('rejects a recipe identifier that is anything but one', async () => {
    const cookie = await signIn('matthias@example.com');
    const injected = {
      day: 'MONDAY',
      meals: [{ slot: 'LUNCH', recipeId: "'; DROP TABLE week_plan; --" }],
    };

    const response = await api.graphql(SAVE, { input: { weekOf: WEEK, days: [injected] } }, cookie);

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('rejects a day that is not a day', async () => {
    const cookie = await signIn('matthias@example.com');

    const response = await api.graphql(
      SAVE,
      { input: { weekOf: WEEK, days: [{ day: 'CATURDAY', meals: [] }] } },
      cookie,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });
});
