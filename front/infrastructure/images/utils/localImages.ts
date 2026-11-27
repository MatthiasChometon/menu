// Photographs served from the site itself. The host keeps one 1024-px WebP per photograph; at build
// time `localizeImages.ts` turns each into AVIF and WebP files in several widths under /img, so a
// phone downloads about 20 KB for the picture that decides LCP instead of 90 KB from a third-party
// origin that needs its own DNS, TCP and TLS round trips first.
//
// Pure on purpose: the build script, the pages' head and the tests all read these same rules.
export type LocalKind = 'recipe' | 'food' | 'equipment';

/** Widths generated per kind, none above the source (recipes 1024 px, the others 768 px). */
export const IMAGE_WIDTHS: Record<LocalKind, readonly number[]> = {
  recipe: [320, 480, 768, 1024],
  food: [160, 320, 480],
  equipment: [160, 320],
};

/** The WebP width a plain `src` points at, for the browsers (and code) that ignore srcset. */
export const FALLBACK_WIDTH: Record<LocalKind, number> = { recipe: 768, food: 320, equipment: 160 };

/**
 * The heaviest AVIF a 390-px phone at 2x downloads for the image that decides LCP (the 768-px
 * variant), in bytes. A build whose picture goes over it fails `check:generated`.
 */
export const LCP_IMAGE_BUDGET_BYTES = 60 * 1024;

/** What `sizes` says about a photograph in a recipe card and in the recipe page hero. */
export const CARD_SIZES = '(min-width: 1024px) 315px, (min-width: 640px) 45vw, calc(100vw - 32px)';
export const HERO_SIZES = '(min-width: 800px) 736px, calc(100vw - 32px)';
/** Small thumbnails (list rows, ingredient and tool pictures). */
export const THUMB_SIZES = '96px';

/** Intrinsic size of every localised photograph: `{ kind: { stem: [width, height] } }`. */
export type LocalImages = Partial<Record<LocalKind, Record<string, [number, number]>>>;

export type LocalSource = {
  avifSrcset: string;
  webpSrcset: string;
  fallback: string;
  width: number;
  height: number;
};

export const localPath = (
  kind: LocalKind,
  stem: string,
  width: number,
  extension: 'avif' | 'webp',
): string => `/img/${kind}/${stem}-${width}.${extension}`;

/** `name.7bc126b0.webp` -> `name.7bc126b0`: the manifest's filename without its extension. */
export const stemOf = (file: string): string => file.replace(/\.[^.]+$/, '');

const srcsetOf = (
  kind: LocalKind,
  stem: string,
  extension: 'avif' | 'webp',
  maxWidth: number,
): string =>
  IMAGE_WIDTHS[kind]
    .filter((width): boolean => width <= maxWidth)
    .map((width): string => `${localPath(kind, stem, width, extension)} ${width}w`)
    .join(', ');

/** The plain URL of a photograph, when it was localised, otherwise undefined. */
export const localFallbackOf = (
  kind: LocalKind,
  file: string,
  local: LocalImages,
): string | undefined => {
  const stem = stemOf(file);

  return local[kind]?.[stem] === undefined
    ? undefined
    : localPath(kind, stem, FALLBACK_WIDTH[kind], 'webp');
};

/** Reads a localised `src` back into its sources; undefined for any other URL. */
export const localSourceOf = (
  src: string | undefined,
  local: LocalImages,
): LocalSource | undefined => {
  const match = /^\/img\/(recipe|food|equipment)\/(.+)-\d+\.webp$/.exec(src ?? '');
  const kind = match?.[1] as LocalKind | undefined;
  const stem = match?.[2];
  const size = kind === undefined || stem === undefined ? undefined : local[kind]?.[stem];
  if (kind === undefined || stem === undefined || size === undefined) return undefined;

  return {
    avifSrcset: srcsetOf(kind, stem, 'avif', size[0]),
    webpSrcset: srcsetOf(kind, stem, 'webp', size[0]),
    fallback: localPath(kind, stem, FALLBACK_WIDTH[kind], 'webp'),
    width: size[0],
    height: size[1],
  };
};

export type PreloadLink = {
  rel: 'preload';
  as: 'image';
  href: string;
  fetchpriority: 'high';
  type?: string;
  imagesrcset?: string;
  imagesizes?: string;
};

/** The `<link rel="preload">` of a photograph, with the srcset and sizes the `<img>` will use. */
export const preloadLinkOf = (src: string, sizes: string, local: LocalImages): PreloadLink => {
  const source = localSourceOf(src, local);
  if (source === undefined)
    return { rel: 'preload', as: 'image', href: src, fetchpriority: 'high' };

  return {
    rel: 'preload',
    as: 'image',
    type: 'image/avif',
    href: source.fallback,
    imagesrcset: source.avifSrcset,
    imagesizes: sizes,
    fetchpriority: 'high',
  };
};

// Listed by the host's manifest but answering 404 (an existing fault of the image host, found on
// 2026-11-27, written down in docs/plans/refactor-socle.md): the site shows its pictogram for them.
// Any other photograph the manifest lists and the host lacks fails `pnpm check:generated`.
export const KNOWN_MISSING_ON_HOST: string[] = [
  'equipment/colander.ae85e743.webp',
  'equipment/container.104562a9.webp',
  'equipment/cookingVessel.c58bd4e2.webp',
  'equipment/cuttingBoard.3add2bc8.webp',
  'equipment/knife.3dc0ee49.webp',
  'equipment/ladle.21e5d554.webp',
  'equipment/mixingBowl.a63c2675.webp',
  'equipment/ovenTray.98629283.webp',
  'equipment/scale.0a7c5e4f.webp',
];

export const unexpectedlyMissing = (
  missing: string[],
  known: string[] = KNOWN_MISSING_ON_HOST,
): string[] => missing.filter((image): boolean => !known.includes(image));
