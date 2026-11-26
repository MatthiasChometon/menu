import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';
import { BUDGET_MS, measureMedian } from '../testing/time-budget';
import { MUTATIONS, QUERIES, type Operation } from './operations';
import { buildRest, photograph } from './rest';
import { buildWorld, type World } from './world';

// Time budgets, in process: the median of at least ten calls of every operation of the API,
// over a database holding months of one person's data. A budget that is missed is a bug in
// the code, not a reason to move the budget (see time-budget.ts for where the numbers come from).
//
// A timing is the one kind of assertion a busy machine can fail by itself: each test gets one
// retry, never more, and never a single sample.

const IMAGES_ROOT = join(tmpdir(), 'menu-images-e2e');
const PREVIOUS_ALLOWLIST = process.env.ALLOWED_EMAILS;

let api: TestApp;
let world: World;
let operations: Operation[];

beforeAll(async (): Promise<void> => {
  // Opens sign-up to anybody: the register and delete-account routes need fresh addresses.
  process.env.ALLOWED_EMAILS = '*';
  api = await startTestApp();
  await rm(IMAGES_ROOT, { recursive: true, force: true });
  await mkdir(join(IMAGES_ROOT, 'recipe'), { recursive: true });
  await mkdir(join(IMAGES_ROOT, 'food'), { recursive: true });
  await writeFile(
    join(IMAGES_ROOT, 'manifest.json'),
    '{"version":1,"recipe":{},"food":{}}\n',
    'utf8',
  );

  world = await buildWorld(api);
  operations = [...QUERIES, ...MUTATIONS, ...buildRest(await photograph())];
});

afterAll(async (): Promise<void> => {
  await api.close();
  await rm(IMAGES_ROOT, { recursive: true, force: true });
  if (PREVIOUS_ALLOWLIST === undefined) delete process.env.ALLOWED_EMAILS;
  else process.env.ALLOWED_EMAILS = PREVIOUS_ALLOWLIST;
});

// Known before the photograph is taken: the names do not depend on its bytes.
const NAMES = [...QUERIES, ...MUTATIONS, ...buildRest(Buffer.alloc(0))].map(
  (operation): string => operation.name,
);

describe('the API answers within its time budget', () => {
  it('reports each operation once, by its name', () => {
    expect(new Set(NAMES).size).toBe(NAMES.length);
  });

  // That NAMES is everything the API offers is checked against the API in coverage.e2e.test.ts.
  it.each(NAMES)('%s', { retry: 1 }, async (name): Promise<void> => {
    const operation = operations.find((candidate): boolean => candidate.name === name);
    if (operation === undefined) throw new Error(`No operation called ${name}.`);

    const { median, durations } = await measureMedian(
      (): Promise<string> => operation.prepare(world),
      (prepared): Promise<void> => operation.run(world, prepared),
    );

    const budget = BUDGET_MS[operation.budget];
    expect(
      median,
      `${name}: median ${median.toFixed(1)} ms over ${durations.length} calls, budget ${budget} ms`,
    ).toBeLessThanOrEqual(budget);
  });
});
