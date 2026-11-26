import { BREAKPOINT_FLOOR_RPS, BUDGETS, OPERATION_CLASS, OPERATION_NAMES } from './budgets.ts';
import type { BudgetClass } from './budgets.ts';
import { BREAKPOINT_RAMP_SECONDS, BREAKPOINT_TOP_RPS, FLOOR_SECONDS } from './profiles.ts';
import type { ProfileName } from './profiles.ts';

/**
 * The end-of-run report: a Markdown page for the run's summary on GitHub (also printed on the
 * console), and k6's raw numbers next to it for whoever wants to compare two runs.
 */

type Metric = {
  values: Record<string, number>;
  thresholds?: Record<string, { ok: boolean }>;
};

type Group = {
  checks?: { name: string; passes: number; fails: number }[];
  groups?: Group[];
};

export type SummaryData = {
  root_group?: Group;
  metrics: Record<string, Metric | undefined>;
  state: { testRunDurationMs: number };
};

const SUMMARY_DIR = (__ENV['SUMMARY_DIR'] ?? '.').replace(/\/$/, '');

const value = (data: SummaryData, metric: string, stat: string): number | undefined =>
  data.metrics[metric]?.values[stat];

const ms = (duration: number | undefined): string =>
  duration === undefined ? '-' : `${Math.round(duration)} ms`;

const percent = (rate: number | undefined): string =>
  rate === undefined ? '-' : `${(rate * 100).toFixed(2)} %`;

const thresholdsOf = (data: SummaryData): [string, string, boolean][] =>
  Object.entries(data.metrics).flatMap(([name, metric]) =>
    Object.entries(metric?.thresholds ?? {}).map(
      ([threshold, { ok }]): [string, string, boolean] => [name, threshold, ok],
    ),
  );

const failedThresholds = (data: SummaryData): [string, string, boolean][] =>
  thresholdsOf(data).filter(([, , ok]): boolean => !ok);

const failedChecks = (group: Group | undefined): string[] => [
  ...(group?.checks ?? [])
    .filter(({ fails }): boolean => fails > 0)
    .map(({ name, passes, fails }): string => `${name}: ${fails} of ${passes + fails} failed`),
  ...(group?.groups ?? []).flatMap(failedChecks),
];

const operationRows = (data: SummaryData): string[] =>
  OPERATION_NAMES.map((name): string => {
    const metric = `http_req_duration{op:${name}}`;
    const budget = BUDGETS[OPERATION_CLASS[name]];
    const p95 = value(data, metric, 'p(95)');
    const p99 = value(data, metric, 'p(99)');
    const within = p95 !== undefined && p95 < budget.p95 && p99 !== undefined && p99 < budget.p99;
    const played = value(data, `http_reqs{op:${name}}`, 'count');

    return `| \`${name}\` | ${OPERATION_CLASS[name]} | ${played ?? '-'} | ${ms(value(data, metric, 'med'))} | ${ms(p95)} | ${ms(p99)} | ${budget.p95} / ${budget.p99} ms | ${within ? 'ok' : 'MISSED'} |`;
  });

const classRows = (data: SummaryData, selector: string): string[] =>
  (Object.keys(BUDGETS) as BudgetClass[]).map((budgetClass): string => {
    const metric = `http_req_duration{class:${budgetClass}${selector}}`;
    const budget = BUDGETS[budgetClass];

    return `| ${budgetClass} | ${ms(value(data, metric, 'med'))} | ${ms(value(data, metric, 'p(95)'))} | ${ms(value(data, metric, 'p(99)'))} | ${budget.p95} / ${budget.p99} ms |`;
  });

const CLASS_HEADER = [
  '| Class | Median | p95 | p99 | Budget p95 / p99 |',
  '| --- | --- | --- | --- | --- |',
];

// The ramp is linear, so the rate reached when the run stopped follows from how long it ran.
const breakpointRate = (data: SummaryData): { reached: number; gaveWay: boolean } => {
  const rampSeconds = Math.max(0, data.state.testRunDurationMs / 1000 - FLOOR_SECONDS);
  const gaveWay = rampSeconds < BREAKPOINT_RAMP_SECONDS - 1;
  const reached =
    BREAKPOINT_FLOOR_RPS +
    ((BREAKPOINT_TOP_RPS - BREAKPOINT_FLOOR_RPS) * Math.min(rampSeconds, BREAKPOINT_RAMP_SECONDS)) /
      BREAKPOINT_RAMP_SECONDS;

  return { reached: Math.round(reached), gaveWay };
};

// The floor is what the API is held to; the ramp only measures where it gives way.
const floorHeld = (data: SummaryData): boolean =>
  thresholdsOf(data)
    .filter(([name]): boolean => name.includes('phase:floor'))
    .every(([, , ok]): boolean => ok);

const profileLines = (profile: ProfileName, data: SummaryData): string[] => {
  if (profile === 'smoke' || profile === 'load') {
    return [
      '### Operations',
      '',
      '| Operation | Class | Played | Median | p95 | p99 | Budget p95 / p99 | |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...operationRows(data),
    ];
  }
  if (profile === 'spike') {
    return [
      '### During the surge and after (the surge is held to twice the budget)',
      '',
      ...CLASS_HEADER,
      ...classRows(data, ''),
      '',
      '### Recovery, once the crowd has left (full budget)',
      '',
      ...CLASS_HEADER,
      ...classRows(data, ',phase:recovery').slice(0, 1),
    ];
  }
  if (profile === 'breakpoint') {
    const { reached, gaveWay } = breakpointRate(data);

    return [
      `### Floor: ${BREAKPOINT_FLOOR_RPS} operations per second for ${FLOOR_SECONDS} s, full budget`,
      '',
      ...CLASS_HEADER,
      ...classRows(data, ',phase:floor'),
      '',
      '### Breakpoint',
      '',
      gaveWay
        ? `The API gave way at about **${reached} operations per second** (errors above 5 % or p95 above 2 s).`
        : `The API held the whole ramp up to ${BREAKPOINT_TOP_RPS} operations per second.`,
    ];
  }

  return ['### By class of operation', '', ...CLASS_HEADER, ...classRows(data, '')];
};

const markdown = (profile: ProfileName, data: SummaryData): string => {
  const missed = failedThresholds(data);
  const green = profile === 'breakpoint' ? floorHeld(data) : missed.length === 0;

  return [
    `## API load, profile ${profile}: ${green ? 'within budget' : 'BUDGET MISSED'}`,
    '',
    `Duration ${Math.round(data.state.testRunDurationMs / 1000)} s, ` +
      `${Math.round(value(data, 'http_reqs', 'count') ?? 0)} requests ` +
      `(${(value(data, 'http_reqs', 'rate') ?? 0).toFixed(1)} per second), ` +
      `failed ${percent(value(data, 'http_req_failed', 'rate'))}, ` +
      `checks passed ${percent(value(data, 'checks', 'rate'))}.`,
    '',
    ...profileLines(profile, data),
    '',
    ...(failedChecks(data.root_group).length === 0
      ? []
      : [
          '### Checks that failed',
          '',
          ...failedChecks(data.root_group).map((line): string => `- ${line}`),
          '',
        ]),
    ...(missed.length === 0
      ? []
      : [
          '### Thresholds crossed',
          '',
          ...missed.map(([name, threshold]): string => `- \`${name}\`: \`${threshold}\``),
          '',
        ]),
  ].join('\n');
};

/** Called by k6 once the run is over. */
export const summaryOf = (profile: ProfileName, data: SummaryData): Record<string, string> => {
  const page = markdown(profile, data);
  const files: Record<string, string> = {
    stdout: page,
    [`${SUMMARY_DIR}/api-${profile}.md`]: page,
    [`${SUMMARY_DIR}/api-${profile}.json`]: JSON.stringify(data, null, 2),
  };
  // The breakpoint run ends crossing a threshold on purpose: k6's exit code cannot tell that from
  // a floor that was missed, so the workflow reads this instead.
  if (profile === 'breakpoint') {
    files[`${SUMMARY_DIR}/api-breakpoint.verdict`] = floorHeld(data) ? 'pass' : 'fail';
  }

  return files;
};
