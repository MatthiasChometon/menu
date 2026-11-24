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

describe('linking Google to an account that already has a password', () => {
  it('drops a password set while the address was unproven', async () => {
    // Somebody registers an address that is not theirs, then the real owner
    // signs in with Google: the password the squatter chose must not survive.
    await users.create('matthias@example.com', 'the-squatters-hash');
    await users.upsertByGoogle('google-1', 'matthias@example.com');

    const record = await users.findRecordByEmail('matthias@example.com');

    expect(record?.passwordHash).toBeNull();
    expect(record?.emailVerifiedAt).not.toBeNull();
  });

  it('keeps the password of an address already confirmed', async () => {
    const created = await users.create('matthias@example.com', 'a-hash');
    if (created === undefined) throw new Error('The account was not created.');
    await users.markEmailVerified(created.id);
    await users.upsertByGoogle('google-1', 'matthias@example.com');

    const record = await users.findRecordByEmail('matthias@example.com');

    expect(record?.passwordHash).toBe('a-hash');
  });

  it('opens one account when two first sign-ins arrive together', async () => {
    const [first, second] = await Promise.all([
      users.upsertByGoogle('google-1', 'matthias@example.com'),
      users.upsertByGoogle('google-1', 'matthias@example.com'),
    ]);

    expect(first.user.id).toBe(second.user.id);
    expect([first.isNew, second.isNew].filter(Boolean)).toHaveLength(1);
  });
});

describe('creating an account', () => {
  it('answers nothing for an address already taken, instead of failing', async () => {
    await users.create('matthias@example.com', 'a-hash');

    expect(await users.create('matthias@example.com', 'another-hash')).toBeUndefined();
  });
});
