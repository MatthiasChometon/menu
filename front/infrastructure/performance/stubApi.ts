import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

// The API is replaced by a table of answers, so a timing depends on the front alone and
// not on a server or a network. Two readers: a visitor who is not signed in (the demo
// week the site ships with) and an account with a profile and a composed week.
export type Reader = 'visitor' | 'account';

// 1x1 stub for every photograph: each <img> loads and stays an <img>, with no host
// to reach (the same stub the visual suite uses).
const PHOTO_STUB = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// The published week is the one realistic composition at hand: every account's week is
// seeded from it, a full seven days of five meals, so the solver and the shopping list
// have what a real account gives them.
type PublishedMenu = { days: Record<string, Record<string, { recipe: string }>> };

const publishedMenu = (): PublishedMenu =>
  JSON.parse(
    readFileSync(
      new URL('../../domain/menu/content/menus/2026-08-03.json', import.meta.url),
      'utf8',
    ),
  ) as PublishedMenu;

const SLOT_TO_API: Record<string, string> = {
  breakfast: 'BREAKFAST',
  postWorkout: 'POST_WORKOUT',
  lunch: 'LUNCH',
  snack: 'SNACK',
  dinner: 'DINNER',
};

const seededDays = (): { day: string; meals: { slot: string; recipeId: string }[] }[] =>
  Object.entries(publishedMenu().days).map(([day, slots]) => ({
    day: day.toUpperCase(),
    meals: Object.entries(slots).map(([slot, meal]) => ({
      slot: SLOT_TO_API[slot] ?? slot,
      recipeId: meal.recipe,
    })),
  }));

const PROFILE = {
  sex: 'MALE',
  age: 30,
  heightCm: 180,
  weightKg: 78,
  dailyActivity: 'SEATED',
  trainingDaysPerWeek: 4,
  trainingType: 'STRENGTH',
  starchQuality: 'WHOLEGRAIN',
  appetite: 'AVERAGE',
  goal: 'GAIN_MUSCLE',
  targets: { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 },
};

const accountAnswers = (variables: Record<string, unknown>): Record<string, unknown> => ({
  me: { me: { id: '1', email: 'reader@example.org', name: 'Reader Example', hasPassword: true } },
  myProfile: { myProfile: PROFILE },
  myWeekPlan: {
    myWeekPlan: {
      weekOf: String(variables['weekOf']),
      updatedAt: '2026-09-18T08:00:00.000Z',
      days: seededDays(),
    },
  },
  householdMembers: { householdMembers: [] },
  myCustomFoods: { myCustomFoods: [] },
  myCustomRecipes: { myCustomRecipes: [] },
  myWeightEntries: { myWeightEntries: [] },
  amIAdmin: { amIAdmin: false },
  googleEnabled: { googleEnabled: false },
});

const CORS = {
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const answerGraphql = async (route: Route, reader: Reader, unstubbed: string[]): Promise<void> => {
  const request = route.request();
  const headers = { ...CORS, 'access-control-allow-origin': request.headers()['origin'] ?? '*' };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });

  const body = request.postDataJSON() as { operationName?: string; variables?: object };
  const name = body.operationName ?? '';
  const answers = reader === 'account' ? accountAnswers({ ...body.variables }) : {};
  const data = answers[name];

  if (data === undefined) {
    if (reader === 'account') unstubbed.push(name);
    return route.fulfill({
      status: 200,
      headers,
      contentType: 'application/json',
      body: JSON.stringify({
        data: null,
        errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
      }),
    });
  }

  return route.fulfill({
    status: 200,
    headers,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
};

/** Answers the API and the photograph host; returns the operations nobody stubbed. */
export const stubApi = async (page: Page, reader: Reader): Promise<string[]> => {
  const unstubbed: string[] = [];
  await page.route('**/graphql', (route): Promise<void> => answerGraphql(route, reader, unstubbed));
  await page.route('**/*', (route): Promise<void> => {
    if (
      route.request().resourceType() === 'image' &&
      !route.request().url().includes('localhost')
    ) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PHOTO_STUB });
    }
    return route.fallback();
  });

  return unstubbed;
};
