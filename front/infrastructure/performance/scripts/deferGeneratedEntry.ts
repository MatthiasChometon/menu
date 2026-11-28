import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deferEntryScript } from '../deferEntryScript';

// Run after `nuxt generate`: every page loads its entry script once the page has loaded.
// See deferEntryScript.ts for why.
const OUTPUT = '.output/public';

const filesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((name): string[] => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

const pages = filesUnder(OUTPUT).filter((path): boolean => path.endsWith('.html'));

pages.forEach((path): void => {
  const before = readFileSync(path, 'utf8');
  const after = deferEntryScript(before);
  if (after !== before) writeFileSync(path, after);
});
process.stdout.write(`Entry script deferred on ${pages.length} pages.\n`);
