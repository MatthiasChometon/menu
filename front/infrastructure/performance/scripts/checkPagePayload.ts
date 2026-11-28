import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pagePayloadProblemsOf } from '../pagePayload';

// Run after `nuxt generate`: exits non-zero when a page's _payload.json is over its ceiling.
const OUTPUT = '.output/public';

const payloadsIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((name): string[] => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return payloadsIn(path);

    return name === '_payload.json' ? [path] : [];
  });

const payloads = payloadsIn(OUTPUT);
const problems = payloads.flatMap((path): string[] =>
  pagePayloadProblemsOf(path, gzipSync(readFileSync(path), { level: 9 }).length),
);
if (problems.length > 0) {
  process.stderr.write(`A page payload is too heavy:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`${payloads.length} page payloads within budget.\n`);
