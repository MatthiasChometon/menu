import { expect, test } from '@playwright/test';

const SLOTS = ['Petit-déjeuner', 'Post-training', 'Déjeuner', 'Goûter', 'Dîner'];

// The first day card; every slot picker inside it is labelled by its meal.
const monday = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('main').locator('div').filter({ hasText: 'Lundi' }).first();

const pickFirst = async (page: import('@playwright/test').Page, slot: string): Promise<void> => {
  await page.getByLabel(slot, { exact: true }).first().click();
  await page.getByRole('option').first().click();
};

test('a composed day lands on its targets by itself', async ({ page }) => {
  await page.goto('/composer');
  await expect(page.getByRole('heading', { name: 'Composer ma semaine' })).toBeVisible();

  for (const slot of SLOTS) await pickFirst(page, slot);

  // The whole promise of the screen: choose dishes, the grammes follow.
  await expect(monday(page).getByText('dans les cibles').first()).toBeVisible();
});

test('a day one dish cannot make says so, instead of serving a triple portion', async ({
  page,
}) => {
  await page.goto('/composer');

  // No amount of scaling turns one breakfast into 3150 kcal, and the screen has
  // to say that rather than quietly weigh out half a kilo of oats.
  await pickFirst(page, 'Petit-déjeuner');

  await expect(monday(page).getByText('impossible à ajuster').first()).toBeVisible();
  await expect(page.getByText(/Ces plats ne peuvent pas faire la journée/)).toBeVisible();
});

test('copying the first day across the week fills every day', async ({ page }) => {
  await page.goto('/composer');

  for (const slot of SLOTS) await pickFirst(page, slot);
  await page.getByRole('button', { name: 'Recopier ce jour sur toute la semaine' }).click();

  await expect(page.getByText('7 / 7 jours composés')).toBeVisible();
  await expect(page.getByRole('main').getByText('dans les cibles')).toHaveCount(7);
});
