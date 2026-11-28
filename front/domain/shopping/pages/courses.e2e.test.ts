import { expect, test } from '@playwright/test';

// The aisles are drawn on the server and hydrated when they come into view: the first tap on an
// item, scrolled to or not, has to be taken, not lost on markup nobody listens to yet.
test('the first tap on a shopping item is taken once its aisle hydrated', async ({ page }) => {
  await page.goto('/courses');
  const item = page.getByRole('main').locator('button[aria-pressed]').first();

  await item.scrollIntoViewIfNeeded();
  await expect(async (): Promise<void> => {
    await item.click();
    await expect(item).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
});
