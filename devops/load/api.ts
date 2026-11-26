import exec from 'k6/execution';
import { sleep } from 'k6';
import type { OperationName } from './budgets.ts';
import { isProfile, optionsOf, PROFILE_NAMES } from './profiles.ts';
import { summaryOf } from './report.ts';
import type { SummaryData } from './report.ts';
import { SCENARIOS, drawOperation } from './scenarios.ts';
import { seedWorld } from './seed.ts';
import type { Data } from './seed.ts';

/**
 * Load test of the API, every operation of it. One profile per run: `PROFILE=load k6 run api.ts`
 * (smoke, load, spike, stress, soak or breakpoint). `prepare.sh` empties the database and opens
 * the accounts before each run; `setup` then fills them with months of data.
 */
const requested = __ENV['PROFILE'];
if (!isProfile(requested)) {
  throw new Error(`PROFILE must be one of ${PROFILE_NAMES.join(', ')}, got "${requested ?? ''}".`);
}
const profile = requested;

export const options = optionsOf(profile);

export const setup = (): Data => seedWorld();

/** One operation, named by the scenario that runs it. */
export const operation = (data: Data): void => {
  SCENARIOS[exec.scenario.name as OperationName](data);
  sleep(0.05);
};

/** One operation drawn from what a crowd does. */
export const mixed = (data: Data): void => {
  SCENARIOS[drawOperation()](data);
};

/** A reader opening the app, to see whether the API is itself again after a surge. */
export const recovery = (data: Data): void => {
  SCENARIOS.me(data);
  SCENARIOS.myWeekPlan(data);
};

export const handleSummary = (data: SummaryData): Record<string, string> =>
  summaryOf(profile, data);
