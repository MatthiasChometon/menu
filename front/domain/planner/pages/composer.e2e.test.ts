import { expect, test } from '@playwright/test';

const dishes = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('main').getByRole('checkbox');

const pick = async (page: import('@playwright/test').Page, count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) await dishes(page).nth(index).click();
};

const next = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('button', { name: /Suivant|Passer/ });

// The pickers only answer once Vue has attached its listeners; clicking before
// that is a tap into the void, and under load that window is wide.
const open = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/composer');
  await page.locator('[data-hydrated]').waitFor();
};

test('opens on the savoury dishes and will not move on without one', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('heading', { name: 'Déjeuner et dîner' })).toBeVisible();
  // The week is built around lunch and dinner; the other steps may be skipped.
  await expect(next(page)).toBeDisabled();
});

test('walks the four meals and lands on a week that is on target', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  await next(page).click();
  await expect(page.getByRole('heading', { name: 'Petit-déjeuner' })).toBeVisible();

  await pick(page, 1);
  await next(page).click();
  await pick(page, 1);
  await next(page).click();
  await pick(page, 1);
  await next(page).click();

  // Spreading happens on the way in: the reader never has to ask for it.
  await expect(page.getByRole('heading', { name: 'Ta semaine' })).toBeVisible();
  await expect(page.getByText('7 / 7 jours composés')).toBeVisible();
  await expect(page.getByRole('main').getByText('dans les cibles').first()).toBeVisible();
});

test('a dish never lands twice in the same day', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  for (let step = 0; step < 4; step += 1) await next(page).click();

  const monday = page.getByRole('main').locator('div').filter({ hasText: 'Lundi' }).first();
  const lunch = await monday.getByLabel('Déjeuner', { exact: true }).first().textContent();
  const dinner = await monday.getByLabel('Dîner', { exact: true }).first().textContent();

  expect(lunch).not.toBe(dinner);
});

test('picking at random fills a step on its own', async ({ page }) => {
  await open(page);

  await page.getByRole('button', { name: 'Au hasard' }).click();

  await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(3);
  await expect(next(page)).toBeEnabled();
});

test('going back keeps what was already chosen', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  await next(page).click();
  await page.getByRole('button', { name: 'Retour' }).click();

  await expect(page.getByRole('heading', { name: 'Déjeuner et dîner' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(2);
});

test('saving asks for an account rather than pretending to work', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  for (let step = 0; step < 4; step += 1) await next(page).click();

  await expect(page.getByRole('button', { name: 'Enregistrer la semaine' })).toBeDisabled();
  await expect(page.getByText('Connecte-toi pour la retrouver')).toBeVisible();
});
