import { expect, test } from '@playwright/test';

// /profil and /verification carry the sign-in form and the page the mailed
// link lands on — the two screens a newcomer meets first, and the ones a
// keyboard or a screen reader has to get through before anything else works.
const PATHS = [
  '/',
  '/batch',
  '/courses',
  '/recette/chiliChicken',
  '/profil',
  '/verification',
  '/reinitialisation',
  // Signed out it shows only its refusal, which still has to be readable.
  '/signalements',
  // Long prose rather than an interface, and the pages somebody reads when they
  // are deciding whether to trust the site with their weight.
  '/mentions-legales',
  '/confidentialite',
  '/conditions',
];

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

    // An empty alt is only a fault when the image carries meaning. Marked
    // decorative — aria-hidden, or role="presentation" — an empty alt is the
    // correct spelling, and flagging it would push somebody to describe a
    // rounded corner to a screen reader.
    const unlabelled = await page.evaluate((): string[] =>
      [...document.querySelectorAll('img')]
        .filter(
          (image): boolean =>
            (image.getAttribute('alt') ?? '').trim() === '' &&
            image.getAttribute('aria-hidden') !== 'true' &&
            image.getAttribute('role') !== 'presentation' &&
            image.getAttribute('role') !== 'none',
        )
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
  // Which card is open is decided client-side; [data-hydrated] appears once the
  // date-dependent state has settled, so the toggle state is trustworthy after it.
  await page.locator('[data-hydrated]').waitFor();

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
  // Scoped to the content: the header's theme toggle is also an aria-pressed
  // button, and it sits before any shopping item in the accessibility tree.
  const content = page.getByRole('main');
  // Spelled out rather than asked for by role: Playwright counts a button with
  // no aria-pressed at all as "not pressed", so { pressed: false } also picks
  // up the week arrows — and the first of those is disabled, which is a click
  // that can never land.
  const picked = content.locator('button[aria-pressed="true"]');
  const unpicked = content.locator('button[aria-pressed="false"]');

  // The list waits for the household before it shows any grammes, so the first
  // item can be several seconds away. Waiting for it rather than polling blind
  // keeps the click on a real item instead of into the skeleton.
  const item = unpicked.first();
  await item.waitFor({ timeout: 15_000 });

  // The markup is served before hydration attaches the listeners, and a click
  // landing in that window is silently lost. Retrying only while nothing is
  // picked keeps this idempotent: a second click can never undo the first.
  await expect
    .poll(async (): Promise<number> => {
      if ((await picked.count()) === 0) await item.click();

      return picked.count();
    })
    .toBeGreaterThan(0);

  await expect(picked.first()).toBeVisible();
});
