import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../../infrastructure/testing/e2e-app';

// The suite only has two invited addresses, so the tests take turns rather
// than share: a leftover account turns the next sign-up into a conflict, and
// the failure then looks like a bug in the code under test.
const INVITED = ['matthias@example.com', 'someone-else@example.com'] as const;
const PASSWORD = 'a-long-enough-password';

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('deleting an account', () => {
  it('erases it, and the session with it', async () => {
    const session = await api.signUp(INVITED[0], PASSWORD);

    const response = await api.post('/auth/delete-account', { password: PASSWORD }, session);
    expect(response.statusCode).toBe(204);

    // Cleared in the same reply. A cookie naming an account that no longer
    // exists fails every later request without ever saying why.
    const cleared = response.cookies.find((cookie): boolean => cookie.name === 'session');
    expect(cleared?.value).toBe('');

    // And the account is really gone: the same address can be signed up again.
    const again = await api.post('/auth/register', { email: INVITED[0], password: PASSWORD });
    expect(again.statusCode).toBe(202);
  });

  it('takes the profile and the composed weeks with it', async () => {
    const session = await api.signUp(INVITED[0], PASSWORD);
    await api.graphql(
      'mutation($i:MeasurementsInput!){ saveProfile(input:$i){ targets { kcal } } }',
      {
        i: {
          sex: 'MALE',
          age: 25,
          heightCm: 180,
          weightKg: 74,
          dailyActivity: 'SEATED',
          trainingDaysPerWeek: 4,
          trainingType: 'STRENGTH',
          starchQuality: 'WHOLE',
          appetite: 'NORMAL',
          goal: 'GAIN_MUSCLE',
        },
      },
      session,
    );

    await api.post('/auth/delete-account', { password: PASSWORD }, session);

    // Signed up afresh, the same address starts with nothing: the profile did
    // not survive its owner. Deleting a row and leaving its data behind is the
    // failure a privacy policy promises will not happen.
    const fresh = await api.signUp(INVITED[0], PASSWORD);
    const profile = await api.graphql<{ myProfile: unknown }>(
      'query { myProfile { age } }',
      undefined,
      fresh,
    );

    expect(profile.data?.myProfile).toBeNull();
  });

  it('refuses without the password when the account has one', async () => {
    const session = await api.signUp(INVITED[1], PASSWORD);

    const response = await api.post('/auth/delete-account', {}, session);

    // A stolen session must not be enough to destroy somebody's data.
    expect(response.statusCode).toBe(401);
  });

  it('refuses a wrong password', async () => {
    const session = await api.signUp(INVITED[1], PASSWORD);

    const response = await api.post('/auth/delete-account', { password: 'not-it-either' }, session);

    expect(response.statusCode).toBe(401);
  });

  it('turns away somebody who is not signed in', async () => {
    const response = await api.post('/auth/delete-account', { password: PASSWORD });

    expect(response.statusCode).toBe(401);
  });
});
