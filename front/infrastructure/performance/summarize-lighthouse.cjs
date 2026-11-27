/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS script run by node in CI */
// Per URL: the benchmarkIndex of every Lighthouse run, and the TBT of every run, with
// median, min and max, on one greppable line each ("LH-SUMMARY"). A TBT median only compares
// with another run whose benchmarkIndex is close: the CI runner speed varies between jobs.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// What the runner was calibrated to: the warm-up benchmarkIndex, the CPU slowdown derived from it
// and the free RAM when the summary is written.
const calibrationLine = (file = path.join(__dirname, '../../perf-calibration.json')) => {
  if (!fs.existsSync(file)) return 'calibration none';
  const { benchmarkIndex } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { slowdownFor } = require('../../perf-calibration.cjs');
  return `warm-up benchmarkIndex ${Math.round(benchmarkIndex)} | factor ${slowdownFor(benchmarkIndex)} | free RAM MB ${Math.round(os.freemem() / 1048576)}`;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const lcpOf = (report) => report.audits['largest-contentful-paint'].numericValue;

const stats = (values) =>
  `median ${Math.round(median(values))} min ${Math.round(Math.min(...values))} max ${Math.round(Math.max(...values))}`;

const summarize = (dirs, calibration = calibrationLine()) => {
  const byUrl = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((name) => /report\.json$/.test(name))) {
      const report = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
      const entry = byUrl.get(report.finalUrl) ?? { tbt: [], bench: [], lcp: [] };
      entry.tbt.push(report.audits['total-blocking-time'].numericValue);
      entry.lcp.push(lcpOf(report));
      entry.bench.push(report.environment.benchmarkIndex);
      byUrl.set(report.finalUrl, entry);
    }
  }
  return [...byUrl].map(
    ([url, { tbt, bench, lcp }]) =>
      `LH-SUMMARY ${url} runs ${tbt.length} | benchmarkIndex ${stats(bench)} [${bench.map(Math.round).join(', ')}] | LCP ms ${stats(lcp)} [${lcp.map(Math.round).join(', ')}] | TBT ms ${stats(tbt)} [${tbt.map(Math.round).join(', ')}] | ${calibration}`,
  );
};

if (require.main === module) {
  for (const line of summarize(process.argv.slice(2))) console.log(line);
}

module.exports = { median, summarize };
