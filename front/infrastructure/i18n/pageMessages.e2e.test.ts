import { expect, test } from '@playwright/test';

// A page loads the messages of the domains it names in `definePageMeta({ translations })`
// and nothing else. Name one too few and vue-i18n shows the key instead of the text,
// which no type check can see: this opens every page, in both languages, and looks
// for a key where a sentence should be.
const PATHS = [
  '/',
  '/aujourdhui',
  '/batch',
  '/mode-cuisine',
  '/composer',
  '/courses',
  '/courses-auto',
  '/progres',
  '/progression',
  '/recettes',
  '/recette/chiliChicken',
  '/poids',
  '/profil',
  '/verification',
  '/reinitialisation',
  '/signalements',
  '/ameliorations',
  '/bienvenue',
  '/mentions-legales',
  '/confidentialite',
  '/conditions',
];

const LOCALES = [
  { code: 'fr', prefix: '' },
  { code: 'en', prefix: '/en' },
];

for (const { code, prefix } of LOCALES) {
  for (const path of PATHS) {
    test(`${prefix}${path} shows no message key in ${code}`, async ({ page }) => {
      await page.goto(`${prefix}${path === '/' && prefix !== '' ? '' : path}`);
      await page.getByRole('banner').waitFor();
      await page.waitForLoadState('networkidle');

      const keys = await page.evaluate((): string[] => {
        const KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;
        const found = new Set<string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = (walker.currentNode.textContent ?? '').trim();
          if (KEY.test(text)) found.add(text);
        }
        for (const element of document.body.querySelectorAll('*')) {
          for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
            const value = (element.getAttribute(name) ?? '').trim();
            if (KEY.test(value)) found.add(`${name}=${value}`);
          }
        }
        return [...found];
      });

      expect(keys).toEqual([]);
    });
  }
}

test('switching language keeps the page translated', async ({ page }) => {
  await page.goto('/recette/chiliChicken');
  await page.getByRole('banner').waitFor();
  await page.goto('/en/recette/chiliChicken');
  await page.getByRole('banner').waitFor();

  await expect(page.locator('html')).toHaveAttribute('lang', /en/);
  await expect(page.getByRole('main')).not.toContainText(/recipe\.[a-z]+/);
});
