// The budgets of the back, taken from the UX rules the maintainer asked for (see the
// "Performance lot" of docs/plans/refactor-socle.md), never from what the code does today.
//
// These are in-process medians: no network, so they leave room for it. The k6 suite
// (devops/load/budgets.ts) holds the same operations to p95 / p99 over HTTP.
export const BUDGET_MS = {
  /** Nielsen 0.1 s, RAIL "response": a read that feeds a screen is instantaneous. */
  read: 100,
  /** Doherty 400 ms end to end, API share 250 ms p95: the median stays under 0.1 s. */
  mutation: 100,
  /** A sign-in or a sign-up is a mutation: the plan gives it no more room, hashing included. */
  credential: 100,
  /** An upload is a mutation too: it keeps the API share of the Doherty threshold, 250 ms. */
  upload: 250,
} as const;

/** One sample is never enough: the median of at least this many calls is what is judged. */
export const SAMPLES = 15;
const WARM_UP = 2;

export const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((left, right): number => left - right);
  const middle = Math.floor(sorted.length / 2);
  const low = sorted[middle - 1] ?? 0;
  const high = sorted[middle] ?? 0;

  return sorted.length % 2 === 0 ? (low + high) / 2 : high;
};

/**
 * Times `run` over `samples` calls and returns the median in milliseconds. `prepare`
 * builds what one call consumes (a row to delete, a run to close) and is not timed.
 * The first calls warm the connection pool and the JIT and are not counted.
 */
export const measureMedian = async <Prepared>(
  prepare: () => Promise<Prepared>,
  run: (prepared: Prepared) => Promise<void>,
  samples: number = SAMPLES,
): Promise<{ median: number; durations: number[] }> => {
  if (samples < 10) throw new Error('A timing budget needs at least 10 samples.');

  const durations: number[] = [];
  for (let call = 0; call < samples + WARM_UP; call += 1) {
    const prepared = await prepare();
    const start = performance.now();
    await run(prepared);
    const elapsed = performance.now() - start;
    if (call >= WARM_UP) durations.push(elapsed);
  }

  return { median: medianOf(durations), durations };
};
