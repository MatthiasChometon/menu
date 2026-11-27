import { describe, expect, it } from 'vitest';
import { crossOriginImagesOf, lcpPreloadOf } from './generatedImages';
import {
  CARD_SIZES,
  IMAGE_WIDTHS,
  LCP_IMAGE_BUDGET_BYTES,
  localFallbackOf,
  localSourceOf,
  KNOWN_MISSING_ON_HOST,
  preloadLinkOf,
  unexpectedlyMissing,
  type LocalImages,
} from './localImages';

const local: LocalImages = {
  recipe: { 'bowl.abc': [1024, 640] },
  food: { 'rice.def': [768, 768] },
};

describe('local images', () => {
  it('points a localised photograph at its own WebP and an unknown one at nothing', () => {
    expect(localFallbackOf('recipe', 'bowl.abc.webp', local)).toBe('/img/recipe/bowl.abc-768.webp');
    expect(localFallbackOf('recipe', 'new.123.webp', local)).toBeUndefined();
  });

  it('describes AVIF and WebP srcsets, each width once, with the intrinsic size', () => {
    const source = localSourceOf('/img/recipe/bowl.abc-768.webp', local);

    expect(source?.avifSrcset).toBe(
      '/img/recipe/bowl.abc-320.avif 320w, /img/recipe/bowl.abc-480.avif 480w, /img/recipe/bowl.abc-768.avif 768w, /img/recipe/bowl.abc-1024.avif 1024w',
    );
    expect(source?.webpSrcset.split(', ')).toHaveLength(IMAGE_WIDTHS.recipe.length);
    expect([source?.width, source?.height]).toEqual([1024, 640]);
  });

  it('never lists a width above the source', () => {
    expect(localSourceOf('/img/food/rice.def-320.webp', local)?.avifSrcset).not.toContain('1024w');
  });

  it('leaves an image of the host alone', () => {
    expect(localSourceOf('https://images.menu.mtxlab.xyz/recipe/x.webp', local)).toBeUndefined();
  });

  it('preloads with the srcset and sizes of the <img>, high priority', () => {
    const link = preloadLinkOf('/img/recipe/bowl.abc-768.webp', CARD_SIZES, local);

    expect(link).toMatchObject({
      rel: 'preload',
      as: 'image',
      imagesizes: CARD_SIZES,
      fetchpriority: 'high',
    });
    expect(link.imagesrcset).toContain('bowl.abc-768.avif 768w');
  });
});

describe('generated pages', () => {
  const html =
    '<link rel="preload" as="image" type="image/avif" href="/img/recipe/a-768.webp" imagesrcset="/img/recipe/a-320.avif 320w, /img/recipe/a-768.avif 768w" imagesizes="100vw" fetchpriority="high"><picture><source type="image/avif" srcset="/img/recipe/a-320.avif 320w"><img src="/img/recipe/a-768.webp"></picture>';

  it('finds the file a phone downloads for the LCP image', () => {
    expect(lcpPreloadOf(html)?.mobileFile).toBe('/img/recipe/a-768.avif');
  });

  it('accepts a page whose images all come from the site', () => {
    expect(crossOriginImagesOf(html)).toEqual([]);
  });

  it.each([
    '<img src="https://images.menu.mtxlab.xyz/recipe/a.webp">',
    '<picture><source srcset="https://cdn.example/a.avif 320w"></picture>',
    '<link rel="preload" as="image" href="https://images.menu.mtxlab.xyz/recipe/a.webp">',
  ])('flags an image from another origin: %s', (page) => {
    expect(crossOriginImagesOf(page)).toHaveLength(1);
  });

  it('keeps the LCP image budget at 60 KB', () => {
    expect(LCP_IMAGE_BUDGET_BYTES).toBe(60 * 1024);
  });
});

describe('photographs the host lacks', (): void => {
  it('fails for a referenced image that is neither on the host nor a known fault', (): void => {
    expect(unexpectedlyMissing(['recipe/ghost.abcd1234.webp'])).toEqual([
      'recipe/ghost.abcd1234.webp',
    ]);
  });

  it('tolerates only the nine equipment photographs already known to be missing', (): void => {
    expect(KNOWN_MISSING_ON_HOST).toHaveLength(9);
    expect(unexpectedlyMissing(KNOWN_MISSING_ON_HOST)).toEqual([]);
  });
});
