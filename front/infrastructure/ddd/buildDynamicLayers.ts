import { globSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

type ComponentDir = {
  path: string;
  prefix: string;
  pathPrefix: boolean;
  extensions: string[];
};

export type DynamicLayers = {
  layerList: string[];
  layerConfigTsGlobList: string[];
  cssList: string[];
  typesDirList: string[];
  componentsList: ComponentDir[];
  translationFileList: (locale: string) => string[];
};

const LAYER_CONFIG_GLOBS = ['domain/**/nuxt.config.ts', 'infrastructure/**/nuxt.config.ts'];

// Every vertical slice (domain/* and infrastructure/*) is a real Nuxt layer,
// discovered by its own nuxt.config.ts. This derives the root config's layer
// wiring from the filesystem so adding a slice needs no manual edit.
export const buildDynamicLayers = (): DynamicLayers => {
  const layerList = discoverLayers();
  return {
    layerList,
    layerConfigTsGlobList: LAYER_CONFIG_GLOBS.map(prependParentDir),
    cssList: discoverLayerStyles(),
    typesDirList: globSync(['domain/**/types', 'infrastructure/**/types']),
    componentsList: layerList.map(buildComponentDir),
    translationFileList: discoverLayerTranslations,
  };
};

const discoverLayers = (): string[] => globSync(LAYER_CONFIG_GLOBS).map(dirname);

const prependParentDir = (glob: string): string => `../${glob}`;

const discoverLayerStyles = (): string[] =>
  globSync(['domain/**/style/*.css', 'infrastructure/**/style/*.css']).map(buildRootAlias);

const buildRootAlias = (file: string): string => `~~/${file.replaceAll(sep, '/')}`;

const discoverLayerTranslations = (locale: string): string[] =>
  globSync([
    `domain/**/translation/${locale}.json`,
    `infrastructure/**/translation/${locale}.json`,
  ]).map((file) => resolve(file));

const buildComponentDir = (layerPath: string): ComponentDir => ({
  path: join(layerPath, 'components'),
  prefix: deriveLayerPrefix(layerPath),
  pathPrefix: false,
  extensions: ['.vue'],
});

// A layer's auto-import prefix is its path in PascalCase, minus the structural
// segments: infrastructure/ui -> Ui, domain/menu -> Menu.
const deriveLayerPrefix = (layerPath: string): string =>
  relative('.', layerPath).split(sep).filter(isNameSegment).map(capitalise).join('');

const isNameSegment = (segment: string): boolean =>
  !['domain', 'infrastructure', 'layers'].includes(segment);

const capitalise = (segment: string): string => segment[0]!.toUpperCase() + segment.slice(1);
