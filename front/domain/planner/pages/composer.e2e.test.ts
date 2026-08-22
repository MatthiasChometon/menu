import { expect, test } from '@playwright/test';

const dishes = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('main').getByRole('checkbox');

const pick = async (page: import('@playwright/test').Page, count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) await dishes(page).nth(index).click();
};

// The order is stable, so an index always names the same card: picking one more
// means reaching past the ones already taken.
const pickAt = async (page: import('@playwright/test').Page, index: number): Promise<void> => {
  await dishes(page).nth(index).click();
};

// Exact: the week chooser has its own "Semaine suivante" arrow, and a loose
// match picks it up as well.
const next = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('button', { name: 'Suivant', exact: true });

// The pickers only answer once Vue has attached its listeners; clicking before
// that is a tap into the void, and under load that window is wide.
const open = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/composer');
  await page.locator('[data-hydrated]').waitFor();
};

test('will not move on until the floor is met, and says how many are missing', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('heading', { name: 'Déjeuner et dîner' })).toBeVisible();
  await expect(next(page)).toBeDisabled();
  await expect(page.getByText('Encore à choisir : 2')).toBeVisible();

  await pickAt(page, 0);
  // One savoury dish would put the same meal at noon and in the evening.
  await expect(next(page)).toBeDisabled();

  await pickAt(page, 1);
  await expect(next(page)).toBeEnabled();
});

test('refuses more dishes than a week can cook', async ({ page }) => {
  await open(page);

  // Four savoury dishes is the ceiling: past that the week cooks single
  // portions, which defeats the point of batching.
  await pick(page, 4);

  await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(4);
  await expect(page.getByText('maximum atteint')).toBeVisible();
  // The fifth card says no before it is tapped rather than swallowing the tap.
  await expect(page.getByRole('main').getByRole('checkbox').nth(4)).toBeDisabled();
});

test('the steps are named and can be walked back through', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  await next(page).click();
  await expect(page.getByRole('heading', { name: 'Petit-déjeuner' })).toBeVisible();

  // Back to a named step by clicking it, not only with the back button.
  await page.getByRole('button', { name: 'Déjeuner et dîner' }).click();

  await expect(page.getByRole('heading', { name: 'Déjeuner et dîner' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(2);
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
  for (let step = 0; step < 4; step += 1) {
    await next(page).click();
    if (step < 3) await pick(page, 1);
  }

  const monday = page.getByRole('main').locator('div').filter({ hasText: 'Lundi' }).first();
  const lunch = await monday.getByLabel('Déjeuner', { exact: true }).first().textContent();
  const dinner = await monday.getByLabel('Dîner', { exact: true }).first().textContent();

  expect(lunch).not.toBe(dinner);
});

test('a step stays marked done after walking back past it', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  await next(page).click();
  await pickAt(page, 0);
  await next(page).click();
  await pickAt(page, 0);
  await next(page).click();
  await pickAt(page, 0);

  // Back two steps: the snack is still chosen, so its bar must stay filled.
  await page.getByRole('button', { name: 'Post-training' }).click();
  await expect(page.getByRole('heading', { name: 'Post-training' })).toBeVisible();

  const snackStep = page.getByRole('button', { name: 'Goûter' });
  const bar = snackStep.locator('span').first();

  // Colouring by position would grey this out; it answers "is it settled".
  await expect(bar).toHaveClass(/bg-primary(?!\/)/);
});

// The whole week, spread and open on Monday.
const composeWeek = async (page: import('@playwright/test').Page): Promise<void> => {
  await open(page);
  await pick(page, 2);
  for (let step = 0; step < 4; step += 1) {
    await next(page).click();
    if (step < 3) await pick(page, 1);
  }
};

// The day's own card, not whatever container happens to mention the day.
const monday = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('main').locator('.rise').filter({ hasText: 'Lundi' }).first();

const mealRow = (
  page: import('@playwright/test').Page,
  meal: string,
): import('@playwright/test').Locator =>
  monday(page).locator('[id^="plan-"] > div').filter({ hasText: meal });

test('a day already on target is left alone', async ({ page }) => {
  await composeWeek(page);

  await expect(monday(page).getByText('dans les cibles')).toBeVisible();
  // Nothing to fix, so nothing is offered.
  await expect(page.getByRole('button', { name: "Appliquer l'échange" })).toHaveCount(0);
});

test('a day off target is offered a dish to swap in', async ({ page }) => {
  await composeWeek(page);

  // One meal cannot carry a day's targets whatever the portions.
  for (const meal of ['Petit-déjeuner', 'Post-training', 'Goûter', 'Dîner']) {
    await mealRow(page, meal).getByRole('button', { name: 'Retirer ce plat' }).click();
  }

  await expect(monday(page).getByText('impossible à ajuster')).toBeVisible();

  const lunch = monday(page).getByLabel('Déjeuner', { exact: true }).first();
  const before = await lunch.textContent();

  const apply = page.getByRole('button', { name: "Appliquer l'échange" });
  await expect(apply).toBeVisible();
  await apply.click();

  // The suggestion is applied where it said it would be.
  await expect(lunch).not.toHaveText(before ?? '');
});

test('picking at random fills a step to its ceiling', async ({ page }) => {
  await open(page);

  await page.getByRole('button', { name: 'Au hasard' }).click();

  await expect(page.getByRole('main').getByRole('checkbox', { checked: true })).toHaveCount(4);
  await expect(next(page)).toBeEnabled();
});

test('saving asks for an account rather than pretending to work', async ({ page }) => {
  await open(page);

  await pick(page, 2);
  for (let step = 0; step < 4; step += 1) {
    await next(page).click();
    if (step < 3) await pick(page, 1);
  }

  await expect(page.getByRole('button', { name: 'Enregistrer la semaine' })).toBeDisabled();
  await expect(page.getByText('Connecte-toi pour la retrouver')).toBeVisible();
});

const chosen = (page: import('@playwright/test').Page): import('@playwright/test').Locator =>
  page.getByRole('main').getByRole('checkbox', { checked: true });

test('composes into whichever week is chosen, not only the published one', async ({ page }) => {
  await open(page);

  // Opens on the week being lived: composing is done ahead, but a Monday with
  // nothing to eat comes first.
  await expect(page.getByRole('combobox', { name: 'Choisir la semaine à composer' })).toHaveText(
    'Cette semaine',
  );

  await page.getByRole('button', { name: 'Semaine suivante' }).click();
  await expect(page.getByRole('combobox', { name: 'Choisir la semaine à composer' })).toHaveText(
    'La semaine prochaine',
  );
});

test("a mis-tapped arrow does not cost an afternoon's choices", async ({ page }) => {
  await open(page);

  await pick(page, 2);
  await expect(chosen(page)).toHaveCount(2);

  // Another week is another week: it starts blank rather than inheriting.
  await page.getByRole('button', { name: 'Semaine suivante' }).click();
  await expect(chosen(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Semaine précédente' }).click();
  await expect(chosen(page)).toHaveCount(2);
});

test('keeps the way forward clear of the tab bar on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  const forward = await next(page).boundingBox();
  const tabs = await page.getByRole('navigation', { name: 'Semaine', exact: true }).boundingBox();

  // The button ends before the tab bar begins. At bottom-0 they overlapped by
  // twenty-six of the button's thirty-six pixels, and the tap went to the nav.
  expect(forward).not.toBeNull();
  expect(tabs).not.toBeNull();
  expect((forward?.y ?? 0) + (forward?.height ?? 0)).toBeLessThanOrEqual(tabs?.y ?? 0);
});
