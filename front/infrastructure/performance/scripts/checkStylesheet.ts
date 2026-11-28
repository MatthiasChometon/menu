import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stylesheetProblemsOf } from '../stylesheet';

// Run after `nuxt generate` and the pruning: the stylesheets every page links, summed,
// against their ceiling.
const OUTPUT = '.output/public';

const html = readFileSync(join(OUTPUT, 'index.html'), 'utf8');
const hrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(
  (match): string => match[1] ?? '',
);
if (hrefs.length === 0) {
  process.stderr.write('index.html links no stylesheet\n');
  process.exit(1);
}

const bytes = hrefs.reduce(
  (total, href): number => total + readFileSync(join(OUTPUT, href)).length,
  0,
);
const problems = stylesheetProblemsOf(bytes);
if (problems.length > 0) {
  process.stderr.write(`The stylesheet is too heavy:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`Stylesheets linked by index.html: ${bytes} B.\n`);
