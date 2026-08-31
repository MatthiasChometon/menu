import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repo root is found by walking up until front/nuxt.config.ts appears, so a
// script resolves the same paths wherever it sits in the tree — no depth to keep
// in sync when a file moves.
const findRoot = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'front', 'nuxt.config.ts'))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('repo root not found: no front/nuxt.config.ts above ' + import.meta.url);
    }
    dir = parent;
  }
  return dir;
};

export const ROOT = findRoot();
export const FRONT = join(ROOT, 'front');
export const CONTENT = join(FRONT, 'content');
export const ASSETS = join(FRONT, 'assets');
export const PUBLIC_DIR = join(FRONT, 'public');
