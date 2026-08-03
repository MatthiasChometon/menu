import { expect, test } from '@playwright/test';

const PAGES = [
  { name: 'week', path: '/' },
  { name: 'shopping', path: '/courses' },
  { name: 'batch', path: '/batch' },
  { name: 'recipe', path: '/recette/chiliChicken' },
] as const;

for (const { name, path } of PAGES) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${name} page in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(path);

      // The week view opens the current day client-side; waiting on a heading
      // that only exists after hydration keeps the baseline deterministic.
      await page.getByRole('banner').waitFor();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, { fullPage: true });
    });
  }
}
