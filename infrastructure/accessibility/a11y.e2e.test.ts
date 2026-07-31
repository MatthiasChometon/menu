import { expect, test } from '@playwright/test';

const PATHS = ['/', '/batch', '/courses', '/recette/chiliChicken'];

for (const path of PATHS) {
  test(`${path} exposes one main heading and the expected landmarks`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('banner').waitFor();

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
  });

  test(`${path} gives every control an accessible name`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('banner').waitFor();

    const unnamed = await page.evaluate((): string[] =>
      [...document.querySelectorAll('button, a[href], select')]
        .filter((element): boolean => {
          const label =
            element.getAttribute('aria-label') ??
            element.getAttribute('title') ??
            element.textContent ??
            '';
          return label.trim() === '';
        })
        .map((element): string => element.outerHTML.slice(0, 120)),
    );

    expect(unnamed).toEqual([]);
  });

  test(`${path} names every image for screen readers`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('banner').waitFor();

    const unlabelled = await page.evaluate((): string[] =>
      [...document.querySelectorAll('img')]
        .filter((image): boolean => (image.getAttribute('alt') ?? '').trim() === '')
        .map((image): string => image.getAttribute('src') ?? '?'),
    );

    expect(unlabelled).toEqual([]);
  });
}

test('the skip link is the first stop and becomes visible on focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').waitFor();

  await page.keyboard.press('Tab');
  const skipLink = page.locator(':focus');

  await expect(skipLink).toHaveAttribute('href', '#content');
  await expect(skipLink).toBeInViewport();
});

test('the day cards announce whether they are open', async ({ page }) => {
  await page.goto('/');
  // Which card is open is decided client-side; [data-today] only exists once
  // hydration has picked the current day, so the state is trustworthy after it.
  await page.locator('[data-today]').waitFor();

  // Anchored on the control itself: a role filter on `expanded` would resolve to
  // a different card once the state flips.
  const toggle = page.locator('button[aria-controls^="day-"]').first();

  await expect(toggle).toBeVisible();
  const wasOpen = (await toggle.getAttribute('aria-expanded')) === 'true';

  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-expanded', wasOpen ? 'false' : 'true');
});

test('a picked shopping item reports its state', async ({ page }) => {
  await page.goto('/courses');
  const item = page.getByRole('button', { pressed: false }).first();

  await item.click();

  await expect(page.getByRole('button', { pressed: true }).first()).toBeVisible();
});
