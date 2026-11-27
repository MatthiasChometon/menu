import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LCP_IMAGE_BUDGET_BYTES } from '../utils/localImages';
import { crossOriginImagesOf, lcpPreloadOf } from '../utils/generatedImages';

// A build that could not read the image host's manifest still succeeds, and ships pages with
// no photographs and no preload: a measurement of that site is a measurement of another site.
// Run after `nuxt generate`; a non-zero exit means "generate again, or point
// NUXT_PUBLIC_IMAGES_BASE at a reachable copy of the host". It also fails when any page loads an
// image from another origin, or when the image that decides LCP weighs over its budget.
const OUTPUT = '.output/public';
const LCP_PAGES = ['recettes/index.html', 'recette/thaiPeanutChickenBowl/index.html'];

const pagesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((name): string[] => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pagesIn(path);

    return name.endsWith('.html') ? [path] : [];
  });

const lcpProblemsOf = (page: string): string[] => {
  const preload = lcpPreloadOf(readFileSync(join(OUTPUT, page), 'utf8'));
  if (preload === undefined) return [`${page}: no <link rel="preload" as="image" imagesrcset>`];

  const heaviest = statSync(join(OUTPUT, preload.mobileFile)).size;

  return heaviest > LCP_IMAGE_BUDGET_BYTES
    ? [
        `${page}: LCP image ${preload.mobileFile} weighs ${heaviest} B, over ${LCP_IMAGE_BUDGET_BYTES} B`,
      ]
    : [];
};

const problems = [
  ...LCP_PAGES.flatMap(lcpProblemsOf),
  ...pagesIn(OUTPUT).flatMap((page): string[] =>
    crossOriginImagesOf(readFileSync(page, 'utf8')).map(
      (url): string => `${page}: image from another origin ${url}`,
    ),
  ),
];
if (problems.length > 0) {
  process.stderr.write(`The generated site has image problems:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write('Generated pages serve their own photographs, the LCP image within budget.\n');
