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
