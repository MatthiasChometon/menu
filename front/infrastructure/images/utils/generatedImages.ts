// Reads the HTML `nuxt generate` wrote, to check what the browser will be asked to download.
const attributeOf = (tag: string, name: string): string | undefined =>
  new RegExp(String.raw`\s${name}="([^"]*)"`).exec(tag)?.[1];

const imageTagsOf = (html: string): string[] =>
  [
    ...html.matchAll(/<(?:img|source)\b[^>]*>/g),
    ...html.matchAll(/<link\b[^>]*\bas="image"[^>]*>/g),
  ].map((match): string => match[0]);

const urlsOf = (tag: string): string[] =>
  ['src', 'srcset', 'imagesrcset', 'href'].flatMap((name): string[] =>
    (attributeOf(tag, name) ?? '')
      .split(',')
      .map((candidate): string => candidate.trim().split(/\s+/)[0] ?? '')
      .filter((url): boolean => url !== ''),
  );

/** Every image URL of the page that points to another origin (anything not starting with "/"). */
export const crossOriginImagesOf = (html: string): string[] =>
  imageTagsOf(html)
    .flatMap(urlsOf)
    .filter((url): boolean => !url.startsWith('/') && !url.startsWith('data:'));

/** The file a 390-px phone at 2x downloads for the page's preloaded image: its 768-px AVIF. */
export const lcpPreloadOf = (html: string): { mobileFile: string } | undefined => {
  const preload = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)]
    .map((match): string => match[0])
    .find(
      (tag): boolean =>
        attributeOf(tag, 'as') === 'image' && attributeOf(tag, 'imagesrcset') !== undefined,
    );
  const candidate = (attributeOf(preload ?? '', 'imagesrcset') ?? '')
    .split(',')
    .map((entry): string => entry.trim())
    .find((entry): boolean => entry.endsWith(' 768w'));

  return candidate === undefined ? undefined : { mobileFile: candidate.split(/\s+/)[0] ?? '' };
};
