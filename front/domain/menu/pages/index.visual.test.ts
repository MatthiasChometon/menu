import { expect, test } from '@playwright/test';

const PAGES = [
  { name: 'week', path: '/' },
  { name: 'shopping', path: '/courses' },
  { name: 'batch', path: '/batch' },
  { name: 'recipe', path: '/recette/chiliChicken' },
] as const;

// One at a time. Twenty-four full-page captures racing each other share one
// preview server: pages came back half-served, and whatever was missing that
// run went into the baseline as if it were the design.
test.describe.configure({ mode: 'serial' });

// Photographs load from a remote host that is slow under the app's warm-up (it
// pulls the whole catalogue) and often unreachable from here — a missing one
// falls back to a placeholder icon mid-capture, so which tiles read as photos
// and which as icons drifted from run to run. The layout around them is what
// this suite measures, so every image request, whatever URL a page builds for
// it, is answered with a 1x1 stub: each <img> loads, stays an <img> (never the
// placeholder), and is masked at capture. No network, no flake, no host.
const PHOTO_STUB = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

for (const { name, path } of PAGES) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${name} page in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.route('**/*', (route) => {
        if (route.request().resourceType() === 'image') {
          return route.fulfill({ status: 200, contentType: 'image/png', body: PHOTO_STUB });
        }
        return route.continue();
      });
      await page.goto(path);

      // The week view opens the current day client-side; waiting on a heading
      // that only exists after hydration keeps the baseline deterministic.
      await page.getByRole('banner').waitFor();

      // Nothing is still loading: the skeletons say so themselves, and a
      // screenshot taken over one is a baseline that changes with the weather.
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });

      // Fonts are self-hosted, so this settles at once; it keeps type from being
      // captured mid-swap now that we no longer wait on the network as a whole.
      await page.evaluate(() => document.fonts.ready);

      // Photographs are masked out rather than waited for (they are stubbed
      // above): what this suite is for is the layout around them, which holds.
      await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.locator('img')],
      });
    });
  }
}
