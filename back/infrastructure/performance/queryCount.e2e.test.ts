import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';
import { QUERIES } from './operations';
import {
  buildWorld,
  call,
  claimJob,
  queueJob,
  reportBug,
  requestImprovement,
  weekOfIndex,
  weekPlanInput,
  dayOfIndex,
  foodInput,
  memberInput,
  recipeInput,
  type World,
} from './world';

// The N+1 guard: the number of SQL statements an operation sends must not depend on how many
// rows it returns. Counted through the Drizzle logger, so it is a number, not a duration: it
// cannot flake, and it catches in a test the slowness that only shows with real data.

let api: TestApp;
let world: World;
const before: Record<string, number> = {};
const after: Record<string, number> = {};

const countEveryQuery = async (into: Record<string, number>): Promise<void> => {
  for (const operation of QUERIES) {
    const { count } = await api.countQueries((): Promise<void> => operation.run(world, ''));
    into[operation.name] = count;
  }
};

const repeat = async (count: number, work: (index: number) => Promise<unknown>): Promise<void> => {
  for (let index = 0; index < count; index += 1) await work(index);
};

/** More of everything a list returns: the point is a bigger answer, not a different one. */
const growTheData = async (): Promise<void> => {
  const reader = 'reader';
  await repeat(30, (index) =>
    call(world, reader, `mutation ($i: CustomFoodInput!) { createCustomFood(input: $i) { id } }`, {
      i: foodInput(5000 + index),
    }),
  );
  await repeat(30, (index) =>
    call(
      world,
      reader,
      `mutation ($i: CustomRecipeInput!) { createCustomRecipe(input: $i) { id } }`,
      {
        i: recipeInput(5000 + index, ['brownRice', 'oats']),
      },
    ),
  );
  await repeat(30, (index) =>
    call(world, reader, `mutation ($i: WeightEntryInput!) { addWeightEntry(input: $i) { id } }`, {
      i: { date: dayOfIndex(4000 + index), kg: 75 },
    }),
  );
  await repeat(10, (index) =>
    call(world, reader, `mutation ($i: WeekPlanInput!) { saveWeekPlan(input: $i) { weekOf } }`, {
      i: weekPlanInput(weekOfIndex(300 + index), ['brownRice']),
    }),
  );
  await repeat(3, (index) =>
    call(
      world,
      reader,
      `mutation ($i: HouseholdMemberInput!) { addHouseholdMember(input: $i) { id } }`,
      {
        i: memberInput(900 + index),
      },
    ),
  );
  await repeat(6, async () => {
    await queueJob(world);
    await claimJob(world);
  });
  await repeat(3, () =>
    call(world, reader, `mutation { pairGroceryDevice(label: "Extra") { token } }`),
  );
  await repeat(20, async (index) => {
    await reportBug(world, 500 + index);
    await requestImprovement(world, 500 + index);
  });
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
  world = await buildWorld(api);
  await countEveryQuery(before);
  await growTheData();
  await countEveryQuery(after);
});

afterAll(async (): Promise<void> => {
  await api.close();
});

describe('a query sends as many statements for a long list as for a short one', () => {
  it.each(QUERIES.map((operation): string => operation.name))('%s', (name) => {
    expect(
      after[name],
      `${name} sent ${String(before[name])} statements before the data grew and ${String(after[name])} after`,
    ).toBe(before[name]);
  });

  it('really did grow the lists it is judged on', async () => {
    const { myWeightEntries } = await call<{ myWeightEntries: unknown[] }>(
      world,
      'reader',
      'query { myWeightEntries { id } }',
    );
    expect(myWeightEntries.length).toBeGreaterThanOrEqual(150);
  });
});
