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

for (const { name, path } of PAGES) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${name} page in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(path);

      // The week view opens the current day client-side; waiting on a heading
      // that only exists after hydration keeps the baseline deterministic.
      await page.getByRole('banner').waitFor();
      await page.waitForLoadState('networkidle');

      // Nothing is still loading: the skeletons say so themselves, and a
      // screenshot taken over one is a baseline that changes with the weather.
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });

      await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, { fullPage: true });
    });
  }
}
