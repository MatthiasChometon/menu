// Prints the cpuSlowdownMultiplier that emulates a mid-tier mobile on this host.
// Source: Lighthouse docs/throttling.md, "Benchmarking CPU Power" and "Calibrating the CPU
// slowdown": by default a 4x multiplier moves a high-end desktop (benchmarkIndex 1500-2000,
// midpoint 1750) to a mid-tier mobile, so one unit of multiplier is 1750 / 4 = 437.5 of
// benchmarkIndex, and  multiplier = benchmarkIndex / 437.5  (the table's "High-End Desktop to
// Mid-Tier Mobile: 4x (2-10)" generalised to any host). Median of the benchmarkIndex of the
// calibration runs (environment.benchmarkIndex of each lhr), rounded to 0.1.
const fs = require('fs');
const dir = process.argv[2] ?? '.lighthouseci';
const REFERENCE_INDEX_PER_UNIT = 1750 / 4;
const indexes = fs
  .readdirSync(dir)
  .filter((file) => /^lhr-.*\.json$/.test(file))
  .map((file) => JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8')).environment.benchmarkIndex)
  .sort((a, b) => a - b);
const median = indexes[Math.floor(indexes.length / 2)];
const multiplier = Math.round((median / REFERENCE_INDEX_PER_UNIT) * 10) / 10;
console.error(
  `benchmarkIndex ${indexes.join(', ')} -> median ${median} -> cpuSlowdownMultiplier ${multiplier}`,
);
console.log(multiplier);
