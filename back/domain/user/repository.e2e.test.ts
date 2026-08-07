import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { UserRepository } from './repository';

let api: TestApp;
let users: UserRepository;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
  users = api.resolve(UserRepository);
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('signing in through Google', () => {
  it('says when the account was opened by this very sign-in', async () => {
    // What sends somebody to the profile form instead of the week. Get it wrong
    // the other way and every reader is shown a form they filled months ago.
    const first = await users.upsertByGoogle('google-1', 'matthias@example.com', 'Matthias');

    expect(first.isNew).toBe(true);
    expect(first.user.email).toBe('matthias@example.com');
  });

  it('says when it is the same person coming back', async () => {
    await users.upsertByGoogle('google-1', 'matthias@example.com', 'Matthias');
    const again = await users.upsertByGoogle('google-1', 'matthias@example.com', 'Matthias');

    expect(again.isNew).toBe(false);
    expect(again.user.id).toBeDefined();
  });

  it('is not a first sign-in when the address already had an account', async () => {
    // Registered with a password first, then signing in through Google: the
    // account exists, so the profile form is not what they need to see.
    await users.create('matthias@example.com', 'a-hashed-password');
    const linked = await users.upsertByGoogle('google-1', 'matthias@example.com');

    expect(linked.isNew).toBe(false);
  });
});
