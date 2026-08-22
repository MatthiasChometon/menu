import { expect, test } from '@playwright/test';

// The three shapes the site is read on. The short mobile height is deliberate:
// a phone browser eats the rest with its own bars, and that is where fixed
// elements start landing on each other.
const FORMATS = [
  { nom: 'mobile', width: 390, height: 670 },
  { nom: 'tablette', width: 768, height: 1024 },
  { nom: 'desktop', width: 1280, height: 900 },
] as const;

const PAGES = [
  ['index', '/'],
  ['courses', '/courses'],
  ['courses-auto', '/courses-auto'],
  ['batch', '/batch'],
  ['composer', '/composer'],
  ['recette', '/recette/chiliChicken'],
  ['profil', '/profil'],
  ['verification', '/verification'],
  ['reinitialisation', '/reinitialisation'],
  ['signalements', '/signalements'],
  ['mentions', '/mentions-legales'],
  ['confidentialite', '/confidentialite'],
  ['conditions', '/conditions'],
  ['404', '/nawak'],
] as const;

type Defaut = { page: string; format: string; quoi: string; detail: string };

// What "responsive" means concretely, asked of the browser rather than the eye:
// nothing wider than the screen, nothing pannable sideways, no text spilling
// out of the box that holds it, and no two fixed bars sharing the same pixels.
const inspecte = async (
  page: import('@playwright/test').Page,
): Promise<Omit<Defaut, 'page' | 'format'>[]> =>
  page.evaluate((): { quoi: string; detail: string }[] => {
    const trouves: { quoi: string; detail: string }[] = [];
    const largeur = document.documentElement.clientWidth;

    if (document.documentElement.scrollWidth > largeur + 1)
      trouves.push({
        quoi: 'page plus large que l ecran',
        detail: `${document.documentElement.scrollWidth} > ${largeur}`,
      });

    const nomDe = (el: Element): string =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''}`;

    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      // Something reaching past the right edge. Overflow containers are allowed
      // to hold wider content — that is what they are for.
      const parent = el.parentElement;
      const parentScrolle =
        parent !== null && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowX);
      if (box.right > largeur + 1 && !parentScrolle && style.position !== 'fixed')
        trouves.push({
          quoi: 'deborde a droite',
          detail: `${nomDe(el)} finit a ${Math.round(box.right)} pour ${largeur}`,
        });

      // Text taller or wider than the box drawn around it: a label that has
      // burst out of its chip, a heading pushing past its card.
      const deborde =
        el.scrollWidth > el.clientWidth + 1 &&
        !['auto', 'scroll'].includes(style.overflowX) &&
        style.overflowX !== 'hidden' &&
        el.children.length === 0;
      if (deborde)
        trouves.push({
          quoi: 'texte deborde de sa boite',
          detail: `${nomDe(el)} : ${el.scrollWidth} dans ${el.clientWidth}`,
        });
    }

    // Two fixed bars sharing pixels: whichever is on top steals the taps.
    const fixes = [...document.querySelectorAll('body *')].filter((el): boolean => {
      const s = getComputedStyle(el);
      return (
        s.position === 'fixed' && s.display !== 'none' && el.getBoundingClientRect().height > 0
      );
    });
    for (let i = 0; i < fixes.length; i += 1)
      for (let j = i + 1; j < fixes.length; j += 1) {
        const a = fixes[i]?.getBoundingClientRect();
        const b = fixes[j]?.getBoundingClientRect();
        if (a === undefined || b === undefined) continue;
        if (
          fixes[i]?.contains(fixes[j] ?? null) === true ||
          fixes[j]?.contains(fixes[i] ?? null) === true
        )
          continue;

        const chevauche =
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        if (chevauche)
          trouves.push({
            quoi: 'deux barres fixes se recouvrent',
            detail: `${nomDe(fixes[i] as Element)} et ${nomDe(fixes[j] as Element)}`,
          });
      }

    return trouves;
  });

// Fourteen pages times three shapes, or four dialogs times three: this walks
// the whole site and needs longer than a test that clicks one button.
test.setTimeout(3 * 60_000);

test('chaque page dans chaque format', async ({ page }) => {
  const defauts: Defaut[] = [];

  for (const format of FORMATS) {
    await page.setViewportSize({ width: format.width, height: format.height });

    for (const [nom, chemin] of PAGES) {
      await page.goto(chemin);
      await page.getByRole('banner').waitFor();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
      await page.waitForTimeout(400);

      // Pannable sideways is invisible until a thumb does it.
      await page.evaluate((): void => window.scrollTo(80, 0));
      const scrollX = await page.evaluate((): number => window.scrollX);
      if (scrollX !== 0)
        defauts.push({
          page: nom,
          format: format.nom,
          quoi: 'pannable sur le cote',
          detail: `scrollX=${scrollX}`,
        });
      await page.evaluate((): void => window.scrollTo(0, 0));

      for (const trouve of await inspecte(page))
        defauts.push({ page: nom, format: format.nom, ...trouve });
    }
  }

  // Nommes un par un dans le message : « il y a trois defauts » n'aide
  // personne, « le dialogue de suppression sort de l'ecran en mobile » si.
  expect(defauts.map((d): string => JSON.stringify(d))).toEqual([]);
});
