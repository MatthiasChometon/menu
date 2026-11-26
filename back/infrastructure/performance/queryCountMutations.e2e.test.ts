import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';
import { buildWorld, call, needs, weekOfIndex, weekPlanInput, type World } from './world';

// The N+1 guard for the mutations that write a list: the statements they send must not grow with
// the length of the list they are given, and a list nobody bounds must be refused, not stored.

let api: TestApp;
let world: World;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
  world = await buildWorld(api);
});

afterAll(async (): Promise<void> => {
  await api.close();
});

const FOODS = ['brownRice', 'oats', 'chicken', 'broccoli', 'eggs', 'olive'];

type ListMutation = {
  name: string;
  query: string;
  /** The variables of a call carrying `length` items in its list. */
  variables: (length: number) => object;
  short: number;
  long: number;
};

const LIST_MUTATIONS: ListMutation[] = [
  {
    name: 'createCustomRecipe',
    query: `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`,
    variables: (length) => ({
      i: {
        name: `Recipe of ${length}`,
        slot: 'MAIN',
        ingredients: FOODS.slice(0, length).map((foodId) => ({ foodId, grams: 100 })),
        steps: Array.from({ length }, (_, index) => `Step ${index}`),
        prepMinutes: 10,
        batch: false,
      },
    }),
    short: 1,
    long: 6,
  },
  {
    name: 'createGroceryJob',
    query: `mutation ($i: CreateGroceryJobInput!) { createGroceryJob(input: $i) { id } }`,
    variables: (length) => ({
      i: { weekOf: weekOfIndex(1), needs: needs().slice(0, length) },
    }),
    short: 1,
    long: 6,
  },
  {
    name: 'saveGrocerySlotWindows',
    query: `mutation ($i: GrocerySlotWindowsInput!) { saveGrocerySlotWindows(input: $i) { weekday } }`,
    variables: (length) => ({
      i: {
        windows: Array.from({ length }, (_, index) => ({
          weekday: 1 + index,
          startMinute: 1080,
          endMinute: 1260,
        })),
      },
    }),
    short: 1,
    long: 5,
  },
  {
    name: 'saveWeekPlan',
    query: `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`,
    variables: (length) => {
      const plan = weekPlanInput(world.weekOf, ['brownRice', 'oats']) as { days: object[] };

      return { i: { ...plan, days: plan.days.slice(0, length) } };
    },
    short: 1,
    long: 7,
  },
];

const statementsOf = async (mutation: ListMutation, length: number): Promise<number> => {
  const { count } = await api.countQueries(async (): Promise<void> => {
    await call(world, 'reader', mutation.query, mutation.variables(length));
  });

  return count;
};

describe('a mutation sends as many statements for a long list as for a short one', () => {
  it.each(LIST_MUTATIONS)('$name', async (mutation): Promise<void> => {
    const short = await statementsOf(mutation, mutation.short);
    const long = await statementsOf(mutation, mutation.long);

    expect(
      long,
      `${mutation.name} sent ${short} statements for ${mutation.short} items and ${long} for ${mutation.long}`,
    ).toBe(short);
  });
});

describe('a list nobody bounds is refused', () => {
  const HUGE = 1000;

  it.each([
    ['createCustomRecipe', 'its ingredients and steps'],
    ['createGroceryJob', 'its needs'],
    ['saveGrocerySlotWindows', 'its windows'],
  ])('%s refuses %s past any reasonable length', async (name): Promise<void> => {
    const mutation = LIST_MUTATIONS.find((candidate): boolean => candidate.name === name);
    if (mutation === undefined) throw new Error(`No list mutation called ${name}.`);
    const variables = mutation.variables(HUGE) as { i: Record<string, unknown> };
    // A recipe's ingredients are a food each: past the stocked ones they repeat.
    if (Array.isArray(variables.i['ingredients'])) {
      variables.i['ingredients'] = Array.from({ length: HUGE }, (_, index) => ({
        foodId: FOODS[index % FOODS.length],
        grams: 100,
      }));
    }

    const response = await api.graphql(mutation.query, variables, world.cookies.reader);

    expect(response.errors, `${name} accepted ${HUGE} items`).toBeDefined();
  });
});
