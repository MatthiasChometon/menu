import { expect, test } from '@playwright/test';

// The icon bundle is no longer part of the first download: a page carries the
// icons it drew on the server, and the bundle arrives when the browser has to
// draw one the page did not bring. Switching to the dark theme draws the moon,
// which no prerendered page contains.
test.describe('an icon first drawn in the browser', () => {
  test('still appears once the bundle has loaded', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const toggle = page.locator('header button[aria-pressed]');
    const before = await toggle.first().innerHTML();

    await toggle.first().click();

    await expect(async () => {
      expect(await toggle.first().innerHTML()).not.toBe(before);
    }).toPass();
    await expect(toggle.first().locator('svg')).toBeVisible();
  });
});
