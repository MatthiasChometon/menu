import { readFileSync } from 'node:fs';

// A build that could not read the image host's manifest still succeeds, and ships pages with
// no photographs and no preload: a measurement of that site is a measurement of another site.
// Run after `nuxt generate`; a non-zero exit means "generate again, or point
// NUXT_PUBLIC_IMAGES_BASE at a reachable copy of the host".
const PAGES = [
  '.output/public/recettes/index.html',
  '.output/public/recette/thaiPeanutChickenBowl/index.html',
];
const HOST = process.env.NUXT_PUBLIC_IMAGES_BASE ?? 'https://images.menu.mtxlab.xyz';

const problemsOf = (file: string): string[] => {
  const html = readFileSync(file, 'utf8');
  const problems: string[] = [];
  if (!/<link[^>]*rel="preload"[^>]*as="image"/.test(html))
    problems.push('no <link rel="preload" as="image">');
  if (!html.includes(`<img src="${HOST}`)) problems.push(`no <img> served from ${HOST}`);

  return problems.map((problem): string => `${file}: ${problem}`);
};

const problems = PAGES.flatMap(problemsOf);
if (problems.length > 0) {
  process.stderr.write(`The generated site has an empty image manifest:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write('Generated pages carry their photographs and the image preload.\n');
