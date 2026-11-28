import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Beasties from 'beasties';

// Run after the prune: each page carries the rules its first paint needs, and the stylesheet
// itself stops blocking that paint. The Lighthouse simulation charges a render-blocking
// stylesheet (and the fonts discovered through it) to the first and largest paint.
const OUTPUT = '.output/public';

const filesUnder = (directory: string): string[] =>
  readdirSync(directory).flatMap((name): string[] => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

const beasties = new Beasties({
  path: OUTPUT,
  publicPath: '/',
  preload: 'media',
  pruneSource: false,
  inlineFonts: false,
  logLevel: 'warn',
});

const pages = filesUnder(OUTPUT).filter((path): boolean => path.endsWith('.html'));

// The font faces are written in a style of their own by the fonts module. Beasties keeps a face
// only when it can match it to a family named in a critical rule, which it cannot when the
// family is reached through a custom property, so it drops them: they are put back as they were.
const FONT_STYLES = /<style>@font-face[^<]*<\/style>/g;

const run = async (): Promise<void> => {
  for (const path of pages) {
    const before = readFileSync(path, 'utf8');
    const fonts = before.match(FONT_STYLES)?.join('') ?? '';
    const after = await beasties.process(before);
    writeFileSync(path, after.replace('</head>', `${fonts}</head>`));
  }
  process.stdout.write(`Critical CSS inlined on ${pages.length} pages.\n`);
};

run().catch((error: unknown): void => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
