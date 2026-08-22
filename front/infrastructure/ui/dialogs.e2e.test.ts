import { expect, test } from '@playwright/test';

const FORMATS = [
  { nom: 'mobile', width: 390, height: 670 },
  { nom: 'tablette', width: 768, height: 1024 },
  { nom: 'desktop', width: 1280, height: 900 },
] as const;

type Defaut = { popup: string; format: string; quoi: string; detail: string };

// Signed in, without a server. Two of the site's four dialogs are only offered
// to somebody with an account, and the API answers over http with a Secure
// cookie the browser will not keep — so the session is answered here instead.
const SESSION = {
  me: { id: 'test', email: 'ux@local.test', name: 'Test UX', hasPassword: true },
  myProfile: {
    sex: 'MALE',
    age: 30,
    heightCm: 180,
    weightKg: 78,
    dailyActivity: 'SEATED',
    trainingDaysPerWeek: 4,
    trainingType: 'STRENGTH',
    starchQuality: 'WHOLE',
    appetite: 'NORMAL',
    goal: 'GAIN_MUSCLE',
    targets: { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 },
  },
};

const simuleSession = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.route('**/graphql', async (route): Promise<void> => {
    const corps = route.request().postDataJSON() as { query?: string } | null;
    const requete = corps?.query ?? '';

    if (requete.includes('query me')) return route.fulfill({ json: { data: { me: SESSION.me } } });
    if (requete.includes('query myProfile'))
      return route.fulfill({ json: { data: { myProfile: SESSION.myProfile } } });

    return route.fulfill({ json: { data: {} } });
  });
};

// A dialog has its own ways of going wrong: taller than the screen with no way
// to scroll, wider than the screen, its buttons pushed off an edge, or its
// content spilling out of the panel that frames it.
const inspecteDialogue = async (
  page: import('@playwright/test').Page,
): Promise<{ quoi: string; detail: string }[]> =>
  page.evaluate((): { quoi: string; detail: string }[] => {
    const trouves: { quoi: string; detail: string }[] = [];
    const panneau = document.querySelector('[role="dialog"]');
    if (panneau === null) return [{ quoi: 'aucun dialogue ouvert', detail: '' }];

    const box = panneau.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    if (box.width > vw + 1)
      trouves.push({
        quoi: 'dialogue plus large que l ecran',
        detail: `${Math.round(box.width)} > ${vw}`,
      });

    // Taller than the screen is only a fault when nothing inside can scroll:
    // then the bottom of the dialog — where the buttons live — is unreachable.
    if (box.height > vh + 1) {
      const defile = [panneau, ...panneau.querySelectorAll('*')].some((el): boolean => {
        const s = getComputedStyle(el);
        return ['auto', 'scroll'].includes(s.overflowY) && el.scrollHeight > el.clientHeight;
      });
      if (!defile)
        trouves.push({
          quoi: 'dialogue plus haut que l ecran sans defilement',
          detail: `${Math.round(box.height)} > ${vh}`,
        });
    }

    if (box.left < -1 || box.right > vw + 1)
      trouves.push({
        quoi: 'dialogue deborde sur le cote',
        detail: `${Math.round(box.left)}..${Math.round(box.right)} pour ${vw}`,
      });

    for (const control of panneau.querySelectorAll('button, input, textarea, select, a')) {
      const c = control.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) continue;

      const nom = `${control.tagName.toLowerCase()} "${(control.textContent ?? '').trim().slice(0, 25)}"`;
      if (c.right > vw + 1 || c.left < -1)
        trouves.push({
          quoi: 'controle hors de l ecran',
          detail: `${nom} a ${Math.round(c.left)}..${Math.round(c.right)}`,
        });
      if (c.bottom > vh + 1)
        trouves.push({
          quoi: 'controle sous le bas de l ecran',
          detail: `${nom} finit a ${Math.round(c.bottom)} pour ${vh}`,
        });
    }

    for (const el of panneau.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || ['auto', 'scroll'].includes(s.overflowX)) continue;
      if (el.scrollWidth > el.clientWidth + 1 && el.children.length === 0)
        trouves.push({
          quoi: 'contenu deborde du panneau',
          detail: `${el.tagName.toLowerCase()} : ${el.scrollWidth} dans ${el.clientWidth}`,
        });
    }

    return trouves;
  });

// Fourteen pages times three shapes, or four dialogs times three: this walks
// the whole site and needs longer than a test that clicks one button.
test.setTimeout(5 * 60_000);

test('chaque pop-up dans chaque format', async ({ page }) => {
  const defauts: Defaut[] = [];
  await simuleSession(page);

  // Sans ce cookie, i18n suit la langue du navigateur — anglaise par défaut
  // sous Playwright — et le site s'ouvre en anglais.
  await page
    .context()
    .addCookies([{ name: 'i18n_redirected', value: 'fr', domain: 'localhost', path: '/' }]);

  const controle = async (nom: string, format: string): Promise<void> => {
    await page.waitForTimeout(600);
    for (const trouve of await inspecteDialogue(page))
      defauts.push({ popup: nom, format, ...trouve });
  };

  for (const format of FORMATS) {
    await page.setViewportSize({ width: format.width, height: format.height });

    await page.goto('/');
    await page.getByRole('banner').waitFor();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Signaler un problème' }).click();
    await controle('signalement', format.nom);
    await page.keyboard.press('Escape');

    await page.goto('/courses');
    await page.getByRole('banner').waitFor();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    // « Tout décocher » n'apparaît qu'une fois quelque chose de coché.
    await page.locator('main button[aria-pressed="false"]').first().click();
    await page.getByRole('button', { name: 'Tout décocher' }).click();
    await controle('repartir-de-zero', format.nom);
    await page.keyboard.press('Escape');

    // L'aperçu d'un plat, depuis le composer.
    await page.goto('/composer');
    await page.getByRole('banner').waitFor();
    await page.waitForTimeout(1500);
    await page
      .getByRole('button', { name: /^Voir la recette/ })
      .first()
      .click();
    await controle('apercu-plat', format.nom);
    await page.keyboard.press('Escape');

    await page.goto('/profil');
    await page.getByRole('banner').waitFor();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
    await page.getByRole('button', { name: /supprimer mon compte/i }).click();
    await controle('suppression-compte', format.nom);
    await page.keyboard.press('Escape');
  }

  // Les listes déroulantes sont des surfaces flottantes elles aussi : elles
  // s'ouvrent par-dessus la page et peuvent sortir de l'écran par la droite ou
  // par le bas, là où rien ne les rattrape.
  for (const format of FORMATS) {
    await page.setViewportSize({ width: format.width, height: format.height });

    for (const [nom, chemin, accessible] of [
      ['langue', '/', 'Choisir la langue'],
      ['semaine-composer', '/composer', 'Choisir la semaine à composer'],
      ['portions', '/recette/chiliChicken', 'Quantités à préparer'],
    ] as const) {
      await page.goto(chemin);
      await page.getByRole('banner').waitFor();
      await page.waitForTimeout(1500);

      const declencheur = page.getByRole('combobox', { name: accessible }).first();
      if ((await declencheur.count()) === 0) {
        defauts.push({
          popup: nom,
          format: format.nom,
          quoi: 'declencheur introuvable',
          detail: accessible,
        });
        continue;
      }

      await declencheur.click();
      await page.waitForTimeout(500);

      const sorties = await page.evaluate((): { quoi: string; detail: string }[] => {
        const liste = document.querySelector('[role="listbox"], [role="menu"]');
        if (liste === null) return [{ quoi: 'liste non ouverte', detail: '' }];

        const box = liste.getBoundingClientRect();
        const dehors: { quoi: string; detail: string }[] = [];
        if (box.right > window.innerWidth + 1 || box.left < -1)
          dehors.push({
            quoi: 'liste hors de l ecran sur le cote',
            detail: `${Math.round(box.left)}..${Math.round(box.right)} pour ${window.innerWidth}`,
          });
        if (box.bottom > window.innerHeight + 1 || box.top < -1)
          dehors.push({
            quoi: 'liste hors de l ecran en hauteur',
            detail: `${Math.round(box.top)}..${Math.round(box.bottom)} pour ${window.innerHeight}`,
          });

        return dehors;
      });

      for (const sortie of sorties) defauts.push({ popup: nom, format: format.nom, ...sortie });
      await page.keyboard.press('Escape');
    }
  }

  // Nommes un par un dans le message : « il y a trois defauts » n'aide
  // personne, « le dialogue de suppression sort de l'ecran en mobile » si.
  expect(defauts.map((d): string => JSON.stringify(d))).toEqual([]);
});
