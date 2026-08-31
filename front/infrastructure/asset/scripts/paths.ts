import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The front root is the ancestor that holds content/ — every Nuxt layer carries
// a nuxt.config.ts, so that alone would stop at the layer, not the project.
const findFront = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'content', 'foods.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('front root not found above ' + import.meta.url);
    dir = parent;
  }
  return dir;
};

export const FRONT = findFront();
export const CONTENT = join(FRONT, 'content');
export const ASSETS = join(FRONT, 'assets');
export const PUBLIC_DIR = join(FRONT, 'public');
export const COMFY = join(dirname(fileURLToPath(import.meta.url)), 'comfy');
