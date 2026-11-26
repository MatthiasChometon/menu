import type { Screen } from './measure';

// The main screens of the app, each with the content that says it is there and an
// interaction a reader repeats on it. Visitors see the demo week the site ships with;
// an account sees its own composed week, which the macro solver has to build.
export const SCREENS: Screen[] = [
  {
    name: 'week (visitor)',
    reader: 'visitor',
    path: '/',
    ready: 'button[aria-expanded]',
    from: '/recettes',
    interaction: {
      name: 'open or close a day',
      perform: async (page): Promise<void> => {
        await page.locator('main button[aria-expanded]').nth(2).click();
      },
    },
  },
  {
    name: 'shopping list (visitor)',
    reader: 'visitor',
    path: '/courses',
    ready: 'button[aria-pressed]',
    from: '/',
    interaction: {
      name: 'tick an item',
      perform: async (page): Promise<void> => {
        await page.locator('main button[aria-pressed]').first().click();
      },
    },
  },
  {
    name: 'recipes (visitor)',
    reader: 'visitor',
    path: '/recettes',
    ready: 'a[href^="/recette/"]',
    from: '/',
    interaction: {
      name: 'type in the search',
      feedbackIsNative: true,
      perform: async (page, index): Promise<void> => {
        const search = page.locator('main input').first();
        if (index === 0) await search.click();
        await page.keyboard.press(index % 2 === 0 ? 'a' : 'Backspace');
      },
    },
  },
  {
    name: 'recipe (visitor)',
    reader: 'visitor',
    path: '/recette/thaiPeanutChickenBowl',
    ready: 'h1',
    from: '/recettes',
  },
  {
    name: 'composer (visitor)',
    reader: 'visitor',
    path: '/composer',
    ready: '[role="checkbox"]',
    from: '/',
    interaction: {
      name: 'pick a dish',
      perform: async (page): Promise<void> => {
        await page.getByRole('main').getByRole('checkbox').first().click();
      },
    },
  },
  {
    name: 'batch cooking (visitor)',
    reader: 'visitor',
    path: '/batch',
    ready: 'h1',
    from: '/',
  },
  {
    name: 'week (account)',
    reader: 'account',
    path: '/',
    ready: 'button[aria-expanded]',
    from: '/aujourdhui',
    interaction: {
      name: 'open or close a day',
      perform: async (page): Promise<void> => {
        await page.locator('main button[aria-expanded]').nth(2).click();
      },
    },
  },
  {
    name: 'shopping list (account)',
    reader: 'account',
    path: '/courses',
    ready: 'button[aria-pressed]',
    from: '/',
    interaction: {
      name: 'tick an item',
      perform: async (page): Promise<void> => {
        await page.locator('main button[aria-pressed]').first().click();
      },
    },
  },
  {
    name: 'today (account)',
    reader: 'account',
    path: '/aujourdhui',
    ready: 'h1',
    from: '/',
  },
];
