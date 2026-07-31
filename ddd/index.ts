import { globSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

// Every vertical slice (domain/* and infrastructure/*) is a real Nuxt layer,
// discovered by its own nuxt.config.ts. This module derives the root config's
// layer wiring from the filesystem so adding a slice needs no manual edit.
const layerConfigGlobList = ['domain/**/nuxt.config.ts', 'infrastructure/**/nuxt.config.ts'];

export const layerList = globSync(layerConfigGlobList).map(dirname);
export const layerConfigTsGlobList = layerConfigGlobList.map((glob) => `../${glob}`);

export const cssList = globSync(['domain/**/style/*.css', 'infrastructure/**/style/*.css']).map(
  (file) => `~~/${file.replaceAll(sep, '/')}`,
);

export const translationFileList = (locale: string): string[] =>
  globSync([
    `domain/**/translation/${locale}.json`,
    `infrastructure/**/translation/${locale}.json`,
  ]).map((file) => resolve(file));

export const typesDirList = globSync(['domain/**/types', 'infrastructure/**/types']);

const layerPrefix = (layerPath: string): string =>
  relative('.', layerPath)
    .split(sep)
    .filter((segment) => !['domain', 'infrastructure', 'layers'].includes(segment))
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join('');

export const componentsList = layerList.map((layerPath) => ({
  path: join(layerPath, 'components'),
  prefix: layerPrefix(layerPath),
  pathPrefix: false,
  extensions: ['.vue'],
}));
