import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, type SentStatement, type TestApp } from '../testing/e2e-app';
import { QUERIES } from './operations';
import { buildWorld, type World } from './world';

// EXPLAIN on the statements that read the largest tables: a read that filters by account must
// be served by an index, whatever size the table has grown to. The planner reads a small table
// whole whatever the indexes are, so the sequential scan is forbidden for the plan (see
// TestApp.explain): a statement that still scans has no index it could have used.

let api: TestApp;
let world: World;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
  world = await buildWorld(api);
});

afterAll(async (): Promise<void> => {
  await api.close();
});

const statementsOf = async (operationName: string, table: string): Promise<SentStatement[]> => {
  const operation = QUERIES.find((candidate): boolean => candidate.name === operationName);
  if (operation === undefined) throw new Error(`No operation called ${operationName}.`);
  const { statements } = await api.countQueries((): Promise<void> => operation.run(world, ''));

  return statements.filter(({ sql }): boolean => sql.includes(`from "${table}"`));
};

// Each account-scoped read and the table it goes through. The two admin lists read every row
// by design and have no filter an index could serve.
const READS: [operation: string, table: string][] = [
  ['myWeightEntries', 'weight'],
  ['myCustomFoods', 'custom_food'],
  ['myCustomRecipes', 'custom_recipe'],
  ['myWeekPlans', 'week_plan'],
  ['myWeekPlan', 'week_plan'],
  ['householdMembers', 'household_member'],
  ['myProfile', 'profile'],
  ['myGroceryJobs', 'grocery_job'],
  ['groceryJob', 'grocery_basket_line'],
  ['groceryJob', 'grocery_job_event'],
  ['groceryJob', 'grocery_job'],
  ['myGroceryDevices', 'grocery_device'],
  ['myGrocerySlotWindows', 'grocery_slot_window'],
  ['myGroceryPreference', 'grocery_preference'],
];

describe('the account-scoped reads are served by an index', () => {
  it.each(READS)('%s reads %s through an index', async (operation, table): Promise<void> => {
    const statements = await statementsOf(operation, table);
    expect(statements.length, `${operation} sent no statement on ${table}`).toBeGreaterThan(0);

    for (const statement of statements) {
      const plan = await api.explain(statement);
      expect(plan, `${operation} on ${table}:\n${statement.sql}\n${plan}`).not.toMatch(
        new RegExp(`Seq Scan on ${table}\b`),
      );
    }
  });
});
