import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { entryChunkProblemsOf, entryScriptOf } from '../entryChunk';

// Run after `nuxt generate`: measures the script the home page loads first and exits non-zero
// when it is over its ceiling or holds the recipe catalogue again.
const OUTPUT = '.output/public';

const script = entryScriptOf(readFileSync(join(OUTPUT, 'index.html'), 'utf8'));
if (script === undefined) {
  process.stderr.write('index.html names no entry script\n');
  process.exit(1);
}

const source = readFileSync(join(OUTPUT, script));
const problems = entryChunkProblemsOf(
  { gzipBytes: gzipSync(source, { level: 9 }).length, source: source.toString('utf8') },
  readFileSync('domain/menu/content/recipes.json', 'utf8'),
);
if (problems.length > 0) {
  process.stderr.write(`The entry script is too heavy:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `Entry script ${script}: ${gzipSync(source, { level: 9 }).length} B gzipped.\n`,
);
