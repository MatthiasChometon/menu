import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const MEASUREMENTS = {
  sex: 'MALE',
  age: 27,
  heightCm: 180,
  weightKg: 75,
  dailyActivity: 'SEATED',
  trainingDaysPerWeek: 5,
  trainingType: 'STRENGTH',
  starchQuality: 'WHOLEGRAIN',
  appetite: 'AVERAGE',
  goal: 'GAIN_MUSCLE',
};

const TARGET_FIELDS = `targets { kcal protein fat carbs fiber }`;

const NUTRITION_TARGETS = `
  query ($input: MeasurementsInput!) {
    nutritionTargets(input: $input) { kcal protein fat carbs fiber }
  }
`;

const MY_PROFILE = `query { myProfile { weightKg goal ${TARGET_FIELDS} } }`;

const SAVE_PROFILE = `
  mutation ($input: MeasurementsInput!) {
    saveProfile(input: $input) { weightKg goal ${TARGET_FIELDS} }
  }
`;

type Targets = { kcal: number; protein: number; fat: number; carbs: number; fiber: number };

let api: TestApp;

const signIn = async (): Promise<string> => {
  const response = await api.post('/auth/register', {
    email: 'matthias@example.com',
    password: 'a-long-enough-password',
  });
  const session = response.cookies.find((cookie): boolean => cookie.name === 'session');

  return `session=${session?.value}`;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('previewing targets', () => {
  it('answers without an account, so the form can preview as it is filled in', async () => {
    const response = await api.graphql<{ nutritionTargets: Targets }>(NUTRITION_TARGETS, {
      input: MEASUREMENTS,
    });

    const targets = response.data?.nutritionTargets;

    expect(response.errors).toBeUndefined();
    expect(targets?.kcal).toBeGreaterThan(2000);
    expect(targets?.protein).toBeGreaterThan(0);
    expect(targets?.fiber).toBeGreaterThan(0);
  });

  it('refuses an age no human form would send', async () => {
    const response = await api.graphql<{ nutritionTargets: Targets }>(NUTRITION_TARGETS, {
      input: { ...MEASUREMENTS, age: 3 },
    });

    expect(response.errors?.[0]?.message).toBeDefined();
    expect(response.data?.nutritionTargets).toBeUndefined();
  });

  it('refuses an answer outside the choices it offers', async () => {
    const response = await api.graphql(NUTRITION_TARGETS, {
      input: { ...MEASUREMENTS, goal: 'BECOME_A_BIRD' },
    });

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('asks for more calories to gain than to lose, all else equal', async () => {
    const gaining = await api.graphql<{ nutritionTargets: Targets }>(NUTRITION_TARGETS, {
      input: { ...MEASUREMENTS, goal: 'GAIN_MUSCLE' },
    });
    const losing = await api.graphql<{ nutritionTargets: Targets }>(NUTRITION_TARGETS, {
      input: { ...MEASUREMENTS, goal: 'LOSE_FAT' },
    });

    expect(gaining.data?.nutritionTargets.kcal).toBeGreaterThan(
      losing.data?.nutritionTargets.kcal ?? 0,
    );
  });
});

describe('the stored profile', () => {
  it('is refused to whoever is not signed in', async () => {
    const response = await api.graphql(MY_PROFILE);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('cannot be saved without a session', async () => {
    const response = await api.graphql(SAVE_PROFILE, { input: MEASUREMENTS });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('is null until the form has been filled in', async () => {
    const cookie = await signIn();

    const response = await api.graphql<{ myProfile: null }>(MY_PROFILE, undefined, cookie);

    expect(response.errors).toBeUndefined();
    expect(response.data?.myProfile).toBeNull();
  });

  it('comes back with its targets once saved', async () => {
    const cookie = await signIn();

    await api.graphql(SAVE_PROFILE, { input: MEASUREMENTS }, cookie);
    const response = await api.graphql<{ myProfile: { weightKg: number; targets: Targets } }>(
      MY_PROFILE,
      undefined,
      cookie,
    );

    expect(response.data?.myProfile.weightKg).toBe(MEASUREMENTS.weightKg);
    expect(response.data?.myProfile.targets.kcal).toBeGreaterThan(2000);
  });

  it('is replaced wholesale rather than piled up', async () => {
    const cookie = await signIn();

    await api.graphql(SAVE_PROFILE, { input: MEASUREMENTS }, cookie);
    await api.graphql(SAVE_PROFILE, { input: { ...MEASUREMENTS, weightKg: 82 } }, cookie);
    const response = await api.graphql<{ myProfile: { weightKg: number; targets: Targets } }>(
      MY_PROFILE,
      undefined,
      cookie,
    );

    expect(response.data?.myProfile.weightKg).toBe(82);
  });

  it('recomputes the targets from the new answers rather than serving a stored copy', async () => {
    const cookie = await signIn();

    await api.graphql(SAVE_PROFILE, { input: { ...MEASUREMENTS, goal: 'LOSE_FAT' } }, cookie);
    const losing = await api.graphql<{ myProfile: { targets: Targets } }>(
      MY_PROFILE,
      undefined,
      cookie,
    );

    await api.graphql(SAVE_PROFILE, { input: { ...MEASUREMENTS, goal: 'GAIN_MUSCLE' } }, cookie);
    const gaining = await api.graphql<{ myProfile: { targets: Targets } }>(
      MY_PROFILE,
      undefined,
      cookie,
    );

    expect(gaining.data?.myProfile.targets.kcal).toBeGreaterThan(
      losing.data?.myProfile.targets.kcal ?? 0,
    );
  });

  it('stays private to its owner', async () => {
    const mine = await signIn();
    await api.graphql(SAVE_PROFILE, { input: MEASUREMENTS }, mine);

    const otherResponse = await api.post('/auth/register', {
      email: 'someone-else@example.com',
      password: 'a-long-enough-password',
    });
    const theirs = `session=${otherResponse.cookies.find((cookie): boolean => cookie.name === 'session')?.value}`;

    const response = await api.graphql<{ myProfile: null }>(MY_PROFILE, undefined, theirs);

    expect(response.data?.myProfile).toBeNull();
  });
});
