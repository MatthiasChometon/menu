import { expect, test } from '@playwright/test';

// An English visitor lands on the prerendered French root and is sent to /en once the browser is up.
// Whatever stayed as the server wrote it (blocks hydrated only when scrolled to) would stay French:
// the whole page is read here without a scroll.
test.describe('English visitor', () => {
  test.use({ locale: 'en-US' });

  test('sees no French on the whole home page, without scrolling', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/en');
    await page.locator('[data-hydrated]').waitFor();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('footer')).toBeVisible();

    const text = await page.locator('body').innerText();

    expect(text).not.toMatch(
      /\b(Déjeuner|Dîner|Courses|Semaine|Recettes|Mentions légales|Petit-déjeuner)\b/,
    );
  });
});
