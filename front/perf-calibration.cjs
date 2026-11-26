/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS, typed by perf-calibration.d.cts */
// The CPU slowdown of every performance measurement, shared by Lighthouse (cpuSlowdownMultiplier)
// and Playwright (CDP Emulation.setCPUThrottlingRate), so both read the same number.
//
//   slowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)
//
// Where the number comes from:
//   - CI: PERF_CPU_SLOWDOWN=4 in the workflow. The runner is the reference machine, so no warm-up
//     runs there and there is nothing to go stale.
//   - locally: `pnpm calibrate` (after `pnpm generate`) measures this host and writes
//     perf-calibration.json; without it the plain 4 applies, with a warning.
// 4 is the PageSpeed Insights mid-tier-mobile slowdown (maintainer approval 2026-11-26). The
// budgets do not move: only the host's speed is divided out, so a slow laptop and a fast CI
// runner are held to the same device. benchmarkIndex is Lighthouse's environment.benchmarkIndex,
// the median of the warm-up runs written by `pnpm calibrate`.
const fs = require('fs');
const path = require('path');

const BASE_SLOWDOWN = 4;
// Source: the median of the 22 per-run medians of environment.benchmarkIndex in the Lighthouse
// reports of this repository's `Perf front` GitHub Actions runs of 2026-11-26 (range 1999-4160).
const REFERENCE_BENCHMARK_INDEX = 2800;
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

/** Reads the benchmarkIndex of every lhr-*.json of a Lighthouse CI output folder. */
const benchmarkIndexOf = (dir) =>
  median(
    fs
      .readdirSync(dir)
      .filter((file) => /^lhr-.*\.json$/.test(file))
      .map(
        (file) =>
          JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).environment.benchmarkIndex,
      ),
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
  slowdownFor,
  benchmarkIndexOf,
  readCalibration,
};

// `node perf-calibration.cjs <lhci output dir>` writes perf-calibration.json from the warm-up runs.
if (require.main === module && process.argv[2] === '--clear') {
  // Before a warm-up: a failed one must leave no value behind, never a stale one.
  fs.rmSync(CALIBRATION_FILE, { force: true });
} else if (require.main === module) {
  const benchmarkIndex = benchmarkIndexOf(process.argv[2] ?? '.lighthouseci');
  const tmp = `${CALIBRATION_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ benchmarkIndex })}\n`);
  fs.renameSync(tmp, CALIBRATION_FILE);
  readCalibration();
}
