import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pruneUnusedCss } from '../pruneCss';

// Run after `nuxt generate`: drops, from the stylesheets, the rules whose classes appear
// in no script and no page of the site. See pruneCss.ts for why.
const OUTPUT = '.output/public';

const filesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((name): string[] => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

const files = filesUnder(OUTPUT);
const shipped = files
  .filter((path): boolean => /\.(js|html)$/.test(path))
  .map((path): string => readFileSync(path, 'utf8'))
  .join('\n');

files
  .filter((path): boolean => path.endsWith('.css'))
  .forEach((path): void => {
    const before = readFileSync(path, 'utf8');
    const after = pruneUnusedCss(before, shipped);
    writeFileSync(path, after);
    process.stdout.write(`${path}: ${before.length} B -> ${after.length} B\n`);
  });
