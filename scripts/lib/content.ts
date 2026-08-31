import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { CONTENT, ROOT } from './paths.ts';

export const readContent = <T>(name: string): T => JSON.parse(readFileSync(join(CONTENT, name), 'utf8'));

export const readJsonAt = <T>(path: string): T =>
  JSON.parse(readFileSync(isAbsolute(path) ? path : join(ROOT, path), 'utf8'));
