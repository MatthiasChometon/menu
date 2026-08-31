import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The front root is the ancestor that holds ddd/ — every Nuxt layer carries a
// nuxt.config.ts, so that alone would stop at the layer, not the project.
const findFront = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'ddd', 'index.ts'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('front root not found above ' + import.meta.url);
    dir = parent;
  }
  return dir;
};

export const FRONT = findFront();
export const CONTENT = join(FRONT, 'domain', 'menu', 'content');
export const ASSETS = join(FRONT, 'assets');
// Branding assets (favicon, PWA icons, OG cards) live in the seo layer's public/,
// merged into the served root by Nuxt like every layer's public/.
export const SEO_PUBLIC = join(FRONT, 'infrastructure', 'seo', 'public');
export const COMFY = join(dirname(fileURLToPath(import.meta.url)), 'comfy');
