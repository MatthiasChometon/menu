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

  test('downloads only the photographs it is about to show', async ({ page }) => {
    const fetched: string[] = [];
    page.on('response', (response): void => {
      if (response.url().endsWith('.webp')) fetched.push(response.url());
    });

    await page.goto('/');
    // Long enough for a prefetch storm to have started: before the fix the
    // count went from four to a hundred and forty-nine inside this window.
    await page.waitForTimeout(2500);

    // A generous ceiling on purpose. What is being caught is the difference
    // between "the images on screen" and "every image in the catalogue", not a
    // precise number that would break the day a card gains a thumbnail.
    expect(fetched.length).toBeLessThan(25);
  });
});
