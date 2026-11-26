import type { Options, Scenario } from 'k6/options';
import {
  BREAKPOINT_FLOOR_RPS,
  BUDGETS,
  MAX_FAILED_RATE,
  MIN_CHECKS_RATE,
  OPERATION_NAMES,
  SURGE_FACTOR,
  budgetOf,
} from './budgets.ts';
import type { BudgetClass } from './budgets.ts';
import { SERIAL, weightOf } from './scenarios.ts';

/**
 * The six ways the API is played, from "does every operation answer" to "where does it give way".
 *
 * - smoke: every operation a few times, one after the other. Is the suite itself sound, and is
 *   each operation inside its budget when nobody else is asking?
 * - load: every operation at once, at the rate a handful of active people would play them.
 * - spike: a sudden crowd on a mix of operations, then back to normal: the surge may cost twice
 *   the budget, the recovery may not cost anything.
 * - stress: the crowd keeps growing past what is expected. The API may slow down, never fall.
 * - soak: a steady crowd for a long time. Memory and latency must stay where they started.
 * - breakpoint: the crowd grows until the API gives way; the rate it held is reported. It must
 *   hold the floor at full budget first.
 */
export const PROFILE_NAMES = ['smoke', 'load', 'spike', 'stress', 'soak', 'breakpoint'] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

export const isProfile = (value: string | undefined): value is ProfileName =>
  PROFILE_NAMES.includes(value as ProfileName);

const CLASSES = Object.keys(BUDGETS) as BudgetClass[];

type Thresholds = NonNullable<Options['thresholds']>;

const everyRequest = (): Thresholds => ({
  http_req_failed: [`rate<${MAX_FAILED_RATE}`],
  checks: [`rate>${MIN_CHECKS_RATE}`],
});

// One threshold per operation, taken from its budget, and a counter so the report can say how
// many times it was played.
const perOperation = (factor = 1): Thresholds =>
  Object.fromEntries(
    OPERATION_NAMES.flatMap((name) => {
      const budget = budgetOf(name);

      return [
        [
          `http_req_duration{op:${name}}`,
          [`p(95)<${budget.p95 * factor}`, `p(99)<${budget.p99 * factor}`],
        ],
        // A broken operation answers 200 with an error: its own checks must hold, and it must have
        // been played at all.
        [`checks{op:${name}}`, [`rate>${MIN_CHECKS_RATE}`]],
        [`http_reqs{op:${name}}`, ['count>0']],
      ];
    }),
  );

// One threshold per class of operation, for the profiles that play a mix of them.
const perClass = (selector: string, factor = 1, classes: BudgetClass[] = CLASSES): Thresholds =>
  Object.fromEntries(
    classes.map((budgetClass) => {
      const budget = BUDGETS[budgetClass];

      return [
        `http_req_duration{class:${budgetClass}${selector}}`,
        [`p(95)<${budget.p95 * factor}`, `p(99)<${budget.p99 * factor}`],
      ];
    }),
  );

// A class that received no request is a mix that stopped playing it, not a quiet run.
const playedClasses = (): Thresholds =>
  Object.fromEntries(
    CLASSES.map((budgetClass) => [`http_reqs{class:${budgetClass}}`, ['count>0']]),
  );

const env = (name: string, fallback: string): string => __ENV[name] ?? fallback;

// An operation per scenario, each named after it: `scenarios.ts` finds what to play from the name.
const eachOperation = (
  build: (name: (typeof OPERATION_NAMES)[number], index: number) => Scenario,
): Options['scenarios'] =>
  Object.fromEntries(OPERATION_NAMES.map((name, index) => [name, build(name, index)]));

// One operation after the other, so what is timed is that operation and not the one next to it.
const smoke = (): Options => ({
  scenarios: eachOperation((_name, index) => ({
    executor: 'per-vu-iterations',
    exec: 'operation',
    vus: 1,
    iterations: 5,
    maxDuration: '30s',
    startTime: `${index}s`,
  })),
  thresholds: { ...everyRequest(), ...perOperation() },
});

// The rate is per ten seconds, so the rarest operation is still played often enough for a p95.
const load = (): Options => ({
  scenarios: eachOperation((name, index) => {
    const serial = SERIAL.includes(name);

    return {
      executor: 'constant-arrival-rate',
      exec: 'operation',
      rate: Math.max(2, Math.round(weightOf(name) * 2)),
      timeUnit: '10s',
      // Staggered: the rarest operations all tick every five seconds, and left in step they would
      // land as one burst of fifty requests, which no handful of people ever sends.
      startTime: `${Math.round((index * 5000) / OPERATION_NAMES.length)}ms`,
      duration: env('LOAD_DURATION', '2m'),
      preAllocatedVUs: serial ? 1 : 2,
      maxVUs: serial ? 1 : 10,
    };
  }),
  thresholds: { ...everyRequest(), ...perOperation() },
});

const mixed = (stages: { target: number; duration: string }[], startRate: number): Scenario => ({
  executor: 'ramping-arrival-rate',
  exec: 'mixed',
  startRate,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 500,
  stages,
});

const spike = (): Options => ({
  scenarios: {
    crowd: mixed(
      [
        { target: 10, duration: '30s' },
        { target: 80, duration: '10s' },
        { target: 80, duration: '30s' },
        { target: 10, duration: '10s' },
        { target: 10, duration: '60s' },
      ],
      10,
    ),
    // Once the crowd has left, a reader asks as if nothing had happened: full budget again.
    recovery: {
      executor: 'constant-arrival-rate',
      exec: 'recovery',
      rate: 5,
      timeUnit: '1s',
      duration: '40s',
      startTime: '95s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      tags: { phase: 'recovery' },
    },
  },
  thresholds: {
    ...everyRequest(),
    ...perClass('', SURGE_FACTOR),
    ...perClass(',phase:recovery', 1, ['read']),
  },
});

const stress = (): Options => ({
  scenarios: {
    crowd: mixed(
      [
        { target: 20, duration: '1m' },
        { target: 60, duration: '1m' },
        { target: 120, duration: '1m' },
        { target: 200, duration: '1m' },
        { target: 20, duration: '1m' },
      ],
      10,
    ),
  },
  // Slow is allowed here, failing is not: past a few percent of errors the API has fallen.
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '1m' }],
    ...playedClasses(),
  },
});

const soak = (): Options => ({
  scenarios: {
    crowd: {
      executor: 'constant-arrival-rate',
      exec: 'mixed',
      rate: 10,
      timeUnit: '1s',
      duration: env('SOAK_DURATION', '30m'),
      preAllocatedVUs: 20,
      maxVUs: 200,
    },
  },
  thresholds: { ...everyRequest(), ...perClass('') },
});

/** The seconds the floor is held before the ramp starts. */
export const FLOOR_SECONDS = 60;
export const BREAKPOINT_TOP_RPS = 400;
export const BREAKPOINT_RAMP_SECONDS = 480;

// First the floor, with the full budget: that is what is asked of the API. Then the crowd grows
// until the error rate or the latency says it has given way, and the run stops there.
const breakpoint = (): Options => ({
  scenarios: {
    floor: {
      executor: 'constant-arrival-rate',
      exec: 'mixed',
      rate: BREAKPOINT_FLOOR_RPS,
      timeUnit: '1s',
      duration: `${FLOOR_SECONDS}s`,
      preAllocatedVUs: 20,
      maxVUs: 100,
      tags: { phase: 'floor' },
    },
    ramp: {
      executor: 'ramping-arrival-rate',
      exec: 'mixed',
      startTime: `${FLOOR_SECONDS}s`,
      startRate: BREAKPOINT_FLOOR_RPS,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 800,
      stages: [{ target: BREAKPOINT_TOP_RPS, duration: `${BREAKPOINT_RAMP_SECONDS}s` }],
      tags: { phase: 'ramp' },
    },
  },
  thresholds: {
    ...perClass(',phase:floor'),
    'http_req_failed{phase:floor}': [`rate<${MAX_FAILED_RATE}`],
    'http_req_failed{phase:ramp}': [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '20s' },
    ],
    'http_req_duration{phase:ramp}': [
      { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '20s' },
    ],
  },
});

export const optionsOf = (profile: ProfileName): Options => {
  const builders: Record<ProfileName, () => Options> = {
    smoke,
    load,
    spike,
    stress,
    soak,
    breakpoint,
  };
  const options = builders[profile]();

  return {
    ...options,
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    setupTimeout: '10m',
    teardownTimeout: '30s',
    discardResponseBodies: false,
  };
};
