import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';
import { glyphsOf } from '../fontGlyphs';

// Run after `nuxt generate`: rewrites each self-hosted font file with only the glyphs the site
// displays (outlines and weights untouched, so the rendering is the same). A Latin file is
// about 30 KB, a quarter of which is glyphs no page of the site draws.
const OUTPUT = '.output/public';

const filesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((name): string[] => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

const files = filesUnder(OUTPUT);
const glyphs = glyphsOf(
  files
    .filter((path): boolean => /\.(js|html|json)$/.test(path))
    .map((path): string => readFileSync(path, 'utf8')),
);

for (const path of files.filter((file): boolean => file.endsWith('.woff2'))) {
  const before = readFileSync(path);
  const after = await subsetFont(before, glyphs, { targetFormat: 'woff2' });
  if (after.length < before.length) {
    writeFileSync(`${path}.tmp`, after);
    renameSync(`${path}.tmp`, path);
  }
  process.stdout.write(
    `${path}: ${before.length} B -> ${Math.min(before.length, after.length)} B\n`,
  );
}
