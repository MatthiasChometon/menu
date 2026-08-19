import { expect, test } from '@playwright/test';

// What a pasted link becomes on Discord or WhatsApp is decided entirely by the
// tags in the served HTML, and nothing in the app ever shows them — so a broken
// card is invisible until somebody shares the site and gets a bare URL back.
//
// Read from the real static output rather than from the composable: what those
// platforms fetch is the file on disk, and the template placeholders are only
// resolved when the page is rendered.

const attributeOf = async (
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string> => (await page.locator(selector).getAttribute('content')) ?? '';

test.describe('the card a pasted link turns into', () => {
  test('announces the page, the site and a picture', async ({ page }) => {
    await page.goto('/');

    const title = await attributeOf(page, 'meta[property="og:title"]');
    const description = await attributeOf(page, 'meta[property="og:description"]');
    const image = await attributeOf(page, 'meta[property="og:image"]');

    // The page's own title AND the site's name: a link that says only "Ta
    // semaine" means nothing to whoever receives it.
    expect(title).toContain('Ta semaine');
    expect(title).toContain('Menu de la semaine');
    expect(description.length).toBeGreaterThan(60);

    // Absolute, because the card is built by a server that fetched this page
    // from elsewhere and has no origin to resolve a path against.
    expect(image).toMatch(/^https?:\/\/\S+\/og-fr\.png$/);

    // summary_large_image, or the picture is shown as a small square thumbnail.
    expect(await attributeOf(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
  });

  test('leaves no template placeholder in what it publishes', async ({ page }) => {
    await page.goto('/');

    // %s and %siteName are filled in by unhead. Unresolved, they ship verbatim
    // into the card — which reads as broken rather than as missing.
    const head = (await page.locator('head').innerHTML()).toLowerCase();

    expect(head).not.toContain('%s');
    expect(head).not.toContain('%sitename');
    expect(head).not.toContain('%separator');
  });

  test('ships the picture it promises, in both languages', async ({ page, request }) => {
    for (const file of ['og-fr.png', 'og-en.png']) {
      const response = await request.get(`/${file}`);

      // A card whose image 404s is a card with no image at all, and the tag
      // alone would still look perfectly correct in the HTML.
      expect(response.status(), `${file} doit exister dans le build`).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }

    await page.goto('/en');
    expect(await attributeOf(page, 'meta[property="og:image"]')).toMatch(/\/og-en\.png$/);
  });
});
