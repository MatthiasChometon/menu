import { readFileSync } from 'node:fs';

// `vitest bench --compare` prints a diff but never fails. This reads the stored baseline
// and the run just made and exits 1 when a benchmark got slower than the tolerance, so a
// hot function that regresses turns the job red.

// A shared runner is noisy: 2x slower is a real regression, 30 % is the machine.
const TOLERANCE = 2;

type Benchmark = { name: string; mean: number };
type Group = { fullName: string; benchmarks: Benchmark[] };
type Report = { files: { groups: Group[] }[] };

const means = (path: string): Map<string, number> => {
  const report = JSON.parse(readFileSync(path, 'utf8')) as Report;
  const found = new Map<string, number>();
  for (const file of report.files) {
    for (const group of file.groups) {
      for (const benchmark of group.benchmarks) {
        found.set(`${group.fullName} > ${benchmark.name}`, benchmark.mean);
      }
    }
  }

  return found;
};

const baseline = means('bench/baseline.json');
const current = means('bench/current.json');
let failed = false;

for (const [name, was] of baseline) {
  const now = current.get(name);
  if (now === undefined) {
    process.stderr.write(`MISSING ${name}: in the baseline, not in this run\n`);
    failed = true;
    continue;
  }
  const ratio = now / was;
  const verdict = ratio > TOLERANCE ? 'SLOWER' : 'ok';
  process.stdout.write(
    `${verdict} ${name}: ${was.toFixed(3)} ms -> ${now.toFixed(3)} ms (x${ratio.toFixed(2)})\n`,
  );
  if (ratio > TOLERANCE) failed = true;
}

if (baseline.size === 0) {
  process.stderr.write('The baseline holds no benchmark.\n');
  failed = true;
}
process.exit(failed ? 1 : 0);
