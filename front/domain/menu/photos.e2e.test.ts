import { expect, test } from '@playwright/test';

// The photographs are imported by a glob so the app knows which ones exist,
// which also makes all 144 of them dependencies of the bundle. Nuxt then emits
// a <link rel="prefetch" as="image"> for every one, and the browser quietly
// fetches the entire catalogue on any page.
//
// Measured on the deployed site before the fix: four images at first paint,
// then 149 and 8.2 MB a second and a half later — to show one thumbnail. On a
// phone in a supermarket that is the whole page budget spent on pictures nobody
// asked to see, and loading="lazy" cannot help: it governs <img>, not a hint.
test.describe('what a page costs in photographs', () => {
  test('asks the browser to prefetch none of them', async ({ page }) => {
    await page.goto('/');

    const hints = await page.locator('link[rel="prefetch"][as="image"]').count();

    expect(hints).toBe(0);
  });

  test('leaves the page alone while it is loading', async ({ page }) => {
    const fetched: string[] = [];
    page.on('response', (response): void => {
      if (response.url().endsWith('.webp')) fetched.push(response.url());
    });

    await page.goto('/');
    // Measured before the background warm-up is allowed to start. That is the
    // window the reader waits through, and the only one where a photograph can
    // cost them anything.
    await page.waitForTimeout(900);

    // A generous ceiling on purpose: what is being caught is the difference
    // between "the images on screen" and "every image in the catalogue" — the
    // deployed site fetched 149 inside this window — not a precise number that
    // would break the day a card gains a thumbnail.
    expect(fetched.length).toBeLessThan(15);
  });

  test('fills the cache afterwards, so a shop with no signal still has them', async ({ page }) => {
    // Answered locally rather than pointed at the image host. What this proves is
    // the warm-up's own behaviour — that it asks for every photograph the
    // manifest lists — and that must hold whether or not the host is reachable
    // from the machine running the suite. A manifest of well over a hundred
    // entries, each served a single pixel, lets the loop be watched fetching them
    // all without a byte leaving the process.
    const catalogue: Record<string, string> = {};
    for (let index = 0; index < 130; index += 1) catalogue[`dish${index}`] = `dish${index}.webp`;

    await page.route('**/manifest.json', (route): Promise<void> =>
      route.fulfill({ json: { version: 1, recipe: catalogue } }),
    );
    // A real one-pixel WebP: the warm-up loads these through new Image(), and only
    // a response the browser accepts as an image is counted the way a live one is.
    const pixel = Buffer.from(
      'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
      'base64',
    );
    await page.route('**/*.webp', (route): Promise<void> =>
      route.fulfill({ contentType: 'image/webp', body: pixel }),
    );

    const fetched = new Set<string>();
    page.on('response', (response): void => {
      if (response.url().endsWith('.webp')) fetched.add(response.url());
    });

    await page.goto('/');

    // The warm-up is easy to break in a way nothing else would notice: it runs
    // behind an idle callback, touches no pixel, and a page that never warms
    // looks exactly like one that does — until the signal goes.
    //
    // Polled rather than timed: sharing one preview server with the rest of the
    // suite, the warm-up takes as long as it takes, and a fixed wait only ever
    // measures how busy the machine was.
    await expect.poll((): number => fetched.size, { timeout: 40_000 }).toBeGreaterThan(100);
  });
});
