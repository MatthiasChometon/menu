/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS, typed by perf-calibration.d.cts */
// The CPU slowdown of every performance measurement, shared by Lighthouse (cpuSlowdownMultiplier)
// and Playwright (CDP Emulation.setCPUThrottlingRate), so both read the same number.
//
//   slowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)
//
// Where the number comes from: `pnpm calibrate` (after `pnpm generate`) measures this host with
// three warm-up Lighthouse runs and writes perf-calibration.json. CI does the same before every
// perf job, and a warm-up whose three indexes stray more than 15 % from their median is not a
// measure of the host: `pnpm calibrate` fails, and the workflow runs it once more. Without the
// file, locally the plain 4 applies with a warning; in CI there is no fallback.
// PERF_CPU_SLOWDOWN still pins the number when set.
// 4 is the Lighthouse mid-tier-mobile slowdown: its documentation ("CPU throttling" in
// docs/throttling.md) says the multiplier is meant to bring the host to the speed of such a phone
// as the benchmarkIndex measures it, which is the dividing done below (maintainer approval
// 2026-11-26, calibration restored 2026-11-27). The
// budgets do not move: only the host's speed is divided out, so a slow laptop and a fast CI
// runner are held to the same device. benchmarkIndex is Lighthouse's environment.benchmarkIndex,
// the median of the warm-up runs written by `pnpm calibrate`.
const fs = require('fs');
const path = require('path');

const BASE_SLOWDOWN = 4;
// Source: the median of the CI runners' benchmarkIndex, the convention shared by the three projects
// (not the "1500-2000" range of the Lighthouse documentation, which is out of date). This repository's own
// median is 2800 (22 per-run medians of the `Perf front` reports of 2026-11-26, range 1999-4160), within
// 10 % of 2950, so the common constant 2950 is kept.
const REFERENCE_BENCHMARK_INDEX = 2950;
// How far a warm-up run may stray from the median of the three before the host's speed is
// considered unsettled (a noisy neighbour on the runner).
const STEADY_TOLERANCE = 0.15;
const CALIBRATION_FILE = path.join(__dirname, 'perf-calibration.json');

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const slowdownFor = (benchmarkIndex) =>
  Math.max(
    1,
    Math.round(((BASE_SLOWDOWN * benchmarkIndex) / REFERENCE_BENCHMARK_INDEX) * 100) / 100,
  );

/** Whether every index is within the tolerance of their median. */
const isSteady = (indexes, tolerance = STEADY_TOLERANCE) => {
  const middle = median(indexes);
  return indexes.every((index) => Math.abs(index - middle) <= tolerance * middle);
};

/** The benchmarkIndex of every lhr-*.json of a Lighthouse CI output folder. */
const benchmarkIndexesOf = (dir) =>
  fs
    .readdirSync(dir)
    .filter((file) => /^lhr-.*\.json$/.test(file))
    .map(
      (file) =>
        JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).environment.benchmarkIndex,
    );

/** The slowdown to apply: the calibrated one, or the plain 4x when no warm-up ran. */
const readCalibration = (file = CALIBRATION_FILE, env = process.env) => {
  if (env.PERF_CPU_SLOWDOWN !== undefined) {
    const slowdown = Number(env.PERF_CPU_SLOWDOWN);
    if (!(slowdown >= 1))
      throw new Error(`PERF_CPU_SLOWDOWN must be a number >= 1, got "${env.PERF_CPU_SLOWDOWN}"`);
    console.error(`perf-calibration: CPU slowdown ${slowdown} (PERF_CPU_SLOWDOWN)`);
    return { benchmarkIndex: undefined, slowdown };
  }
  if (!fs.existsSync(file)) {
    if (env.CI)
      throw new Error(
        'perf-calibration: set PERF_CPU_SLOWDOWN in CI, there is no calibration file',
      );
    console.error(
      `perf-calibration: no ${path.basename(file)}, CPU slowdown ${BASE_SLOWDOWN} (uncalibrated)`,
    );
    return { benchmarkIndex: undefined, slowdown: BASE_SLOWDOWN };
  }
  const { benchmarkIndex } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const slowdown = slowdownFor(benchmarkIndex);
  console.error(`perf-calibration: benchmarkIndex ${benchmarkIndex}, CPU slowdown ${slowdown}`);
  return { benchmarkIndex, slowdown };
};

module.exports = {
  REFERENCE_BENCHMARK_INDEX,
  median,
  isSteady,
  benchmarkIndexesOf,
  slowdownFor,
  readCalibration,
};

// `node perf-calibration.cjs <lhci output dir>` writes perf-calibration.json from the warm-up runs.
if (require.main === module && process.argv[2] === '--clear') {
  // Before a warm-up: a failed one must leave no value behind, never a stale one.
  fs.rmSync(CALIBRATION_FILE, { force: true });
} else if (require.main === module) {
  const indexes = benchmarkIndexesOf(process.argv[2] ?? '.lighthouseci');
  if (!isSteady(indexes)) {
    console.error(`perf-calibration: warm-up indexes ${indexes.join(', ')} stray more than 15 %`);
    process.exit(1);
  }
  const benchmarkIndex = median(indexes);
  const tmp = `${CALIBRATION_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ benchmarkIndex })}\n`);
  fs.renameSync(tmp, CALIBRATION_FILE);
  readCalibration();
}
