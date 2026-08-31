import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { CONTENT, FRONT } from './paths';

export const readContent = <T>(name: string): T => JSON.parse(readFileSync(join(CONTENT, name), 'utf8'));

// A relative path is read from the front root, so a caller can pass
// domain/menu/content/menus/2026-08-03.json whatever the working directory is.
export const readJsonAt = <T>(path: string): T =>
  JSON.parse(readFileSync(isAbsolute(path) ? path : join(FRONT, path), 'utf8'));
