import { expect, test } from '@playwright/test';

// Tailwind v4 stopped giving <button> a cursor: pointer, which the site had
// been relying on since v3. Nothing looked broken — every control simply told
// the mouse there was nothing to click, on every page at once.
//
// Read from the browser's computed style rather than from the class list: what
// matters is what the pointer does, not which rule was meant to make it happen.
const cursorOf = async (page: import('@playwright/test').Page, selector: string): Promise<string> =>
  page
    .locator(selector)
    .first()
    .evaluate((node) => getComputedStyle(node).cursor);

test.describe('what the pointer says about a control', () => {
  test('turns to a hand over something that can be clicked', async ({ page }) => {
    await page.goto('/');

    // The theme toggle: a real <button> the framework builds, not a link.
    expect(await cursorOf(page, 'header button')).toBe('pointer');
  });

  test('keeps the hand on the controls inside the page, not only the header', async ({ page }) => {
    await page.goto('/courses/');

    // Ticking an item off is the gesture this site exists for. Disabled
    // controls are excluded on purpose: a week arrow with nowhere to go says
    // not-allowed, which is right, and it happens to come first in the page.
    expect(await cursorOf(page, 'main button:not([disabled]), main [role="button"]')).toBe(
      'pointer',
    );
  });
});
