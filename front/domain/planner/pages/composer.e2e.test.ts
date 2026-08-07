import { expect, test } from '@playwright/test';

// The dish cards of one group, in document order.
const groupDishes = (
  page: import('@playwright/test').Page,
  heading: string,
): import('@playwright/test').Locator =>
  page
    .getByRole('main')
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
    .getByRole('checkbox');

const pick = async (
  page: import('@playwright/test').Page,
  heading: string,
  count: number,
): Promise<void> => {
  const dishes = groupDishes(page, heading);
  for (let index = 0; index < count; index += 1) await dishes.nth(index).click();
};

test('spreading is refused until there is something to eat at midday', async ({ page }) => {
  await page.goto('/composer');

  const spread = page.getByRole('button', { name: 'Répartir sur la semaine' });

  await expect(spread).toBeDisabled();
  await expect(page.getByText('Choisis au moins un plat pour le déjeuner')).toBeVisible();
});

test('two savoury dishes fill every lunch and dinner of the week', async ({ page }) => {
  await page.goto('/composer');

  await pick(page, 'Déjeuner et dîner', 2);
  await page.getByRole('button', { name: 'Répartir sur la semaine' }).click();

  await expect(page.getByRole('heading', { name: 'Ta semaine' })).toBeVisible();
  await expect(page.getByText('7 / 7 jours composés')).toBeVisible();
});

test('a dish never lands twice in the same day', async ({ page }) => {
  await page.goto('/composer');

  await pick(page, 'Déjeuner et dîner', 2);
  await page.getByRole('button', { name: 'Répartir sur la semaine' }).click();

  // Monday is open by default; its lunch and dinner must differ, which is the
  // rule the rotation exists to keep.
  const monday = page.getByRole('main').locator('div').filter({ hasText: 'Lundi' }).first();
  const lunch = await monday.getByLabel('Déjeuner', { exact: true }).first().textContent();
  const dinner = await monday.getByLabel('Dîner', { exact: true }).first().textContent();

  expect(lunch).not.toBe(dinner);
});

test('a full week of choices lands on its targets by itself', async ({ page }) => {
  await page.goto('/composer');

  await pick(page, 'Déjeuner et dîner', 2);
  await pick(page, 'Petit-déjeuner', 1);
  await pick(page, 'Post-training', 1);
  await pick(page, 'Goûter', 1);
  await page.getByRole('button', { name: 'Répartir sur la semaine' }).click();

  // The whole promise: choose dishes, the grammes follow.
  await expect(page.getByRole('main').getByText('dans les cibles').first()).toBeVisible();
});

test('saving asks for an account rather than pretending to work', async ({ page }) => {
  await page.goto('/composer');

  await pick(page, 'Déjeuner et dîner', 2);
  await page.getByRole('button', { name: 'Répartir sur la semaine' }).click();

  await expect(page.getByRole('button', { name: 'Enregistrer la semaine' })).toBeDisabled();
  await expect(page.getByText('Connecte-toi pour la retrouver')).toBeVisible();
});
