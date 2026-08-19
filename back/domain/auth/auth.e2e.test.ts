import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { UserRepository } from '../user/repository';
import { AuthTokenRepository, EMAIL_VERIFICATION } from './tokens/repository';

const EMAIL = 'matthias@example.com';
const PASSWORD = 'a-long-enough-password';

const ME = `query { me { id email name } }`;

let api: TestApp;

const messageOf = (body: string): string => (JSON.parse(body) as { message: string }).message;

const registerAndSignIn = (): Promise<string> => api.signUp(EMAIL, PASSWORD);

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('registering', () => {
  it('sends a link and withholds the session until it is followed', async () => {
    const response = await api.post('/auth/register', {
      email: EMAIL,
      password: PASSWORD,
      name: 'Matthias',
    });

    expect(response.statusCode).toBe(202);
    // The account exists but opens nothing yet. Handing out a session here
    // would make the whole check decorative: anyone could sign up with someone
    // else's address and use the account while the owner deleted the mail.
    expect(response.cookies.find((cookie): boolean => cookie.name === 'session')).toBeUndefined();
    expect(api.mails().at(-1)?.to).toBe(EMAIL);
  });

  it('puts a usable link in the message, not just a token in the database', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const message = api.mails().at(-1);

    expect(message?.html).toContain('/verification?token=');
    // The plain-text part carries the link too: a client that refuses HTML
    // would otherwise show a message with no way out of it.
    expect(message?.text).toMatch(/\/verification\?token=[a-f0-9]{64}/);
  });

  it('never exposes the password hash', async () => {
    const response = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain(PASSWORD);
  });

  it('keeps the session cookie out of reach of scripts', async () => {
    const cookie = await registerAndSignIn();

    expect(cookie).toContain('session=');
  });

  it('refuses an address that already has an account', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const second = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    expect(second.statusCode).toBe(409);
  });

  it('refuses a password too short to be worth hashing', async () => {
    const response = await api.post('/auth/register', { email: EMAIL, password: 'short' });

    expect(response.statusCode).toBe(400);
  });

  it('refuses something that is not an email address', async () => {
    const response = await api.post('/auth/register', {
      email: 'not-an-email',
      password: PASSWORD,
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('the guest list', () => {
  it('turns away an address that was never invited', async () => {
    const response = await api.post('/auth/register', {
      email: 'stranger@example.com',
      password: PASSWORD,
    });

    expect(response.statusCode).toBe(403);
  });

  it('creates nothing for an address it turned away', async () => {
    await api.post('/auth/register', { email: 'stranger@example.com', password: PASSWORD });

    const login = await api.post('/auth/login', {
      email: 'stranger@example.com',
      password: PASSWORD,
    });

    expect(login.statusCode).toBe(401);
  });

  it('still lets an invited address in', async () => {
    const response = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    expect(response.statusCode).toBe(202);
  });
});

describe('confirming the address', () => {
  const linkToken = (): string => {
    const token = /token=([a-f0-9]{64})/.exec(api.mails().at(-1)?.text ?? '')?.[1];
    if (token === undefined) throw new Error('No verification link was sent.');

    return token;
  };

  it('opens a session and never shows the password hash', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const response = await api.post('/auth/verify-email', { token: linkToken() });

    expect(response.statusCode).toBe(200);
    expect(response.cookies.find((cookie): boolean => cookie.name === 'session')).toBeDefined();
    // REST serialises whatever object it is handed, unlike GraphQL which only
    // exposes decorated fields — so this is the reply that could leak it.
    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain(PASSWORD);
  });

  it('spends the link, so a forwarded message opens nothing', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });
    const token = linkToken();
    await api.post('/auth/verify-email', { token });

    const second = await api.post('/auth/verify-email', { token });

    expect(second.statusCode).toBe(401);
  });

  it('refuses a link that has run out of time', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });
    const account = await api.resolve(UserRepository).findRecordByEmail(EMAIL);
    if (account === undefined) throw new Error('The account was not created.');

    // Issued straight through the repository with a deadline already behind
    // us: waiting a day for the real one is not a test anybody would run.
    const stale = await api
      .resolve(AuthTokenRepository)
      .issue(account.id, EMAIL_VERIFICATION, -1000);

    const response = await api.post('/auth/verify-email', { token: stale });

    expect(response.statusCode).toBe(401);
  });

  it('refuses a token nobody ever issued', async () => {
    const response = await api.post('/auth/verify-email', { token: 'a'.repeat(64) });

    expect(response.statusCode).toBe(401);
  });
});

describe('asking for another link', () => {
  it('answers the same whether or not the address has an account', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const known = await api.post('/auth/resend-verification', { email: EMAIL });
    const unknown = await api.post('/auth/resend-verification', { email: 'nobody@example.com' });

    // Identical on purpose: a different answer would make this the cheapest
    // way to find out which addresses have accounts here.
    expect(known.statusCode).toBe(204);
    expect(unknown.statusCode).toBe(204);
  });

  it('sends one to an address still waiting, and none to an unknown one', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });
    const afterRegister = api.mails().length;

    await api.post('/auth/resend-verification', { email: 'nobody@example.com' });
    expect(api.mails()).toHaveLength(afterRegister);

    await api.post('/auth/resend-verification', { email: EMAIL });
    expect(api.mails()).toHaveLength(afterRegister + 1);
  });

  it('sends nothing to an address that is already confirmed', async () => {
    await api.signUp(EMAIL, PASSWORD);
    const afterVerification = api.mails().length;

    await api.post('/auth/resend-verification', { email: EMAIL });

    expect(api.mails()).toHaveLength(afterVerification);
  });

  it('retires the previous link, so only the newest one works', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });
    const first = /token=([a-f0-9]{64})/.exec(api.mails().at(-1)?.text ?? '')?.[1] ?? '';

    await api.post('/auth/resend-verification', { email: EMAIL });
    const second = /token=([a-f0-9]{64})/.exec(api.mails().at(-1)?.text ?? '')?.[1] ?? '';

    expect(second).not.toBe(first);
    expect((await api.post('/auth/verify-email', { token: first })).statusCode).toBe(401);
    expect((await api.post('/auth/verify-email', { token: second })).statusCode).toBe(200);
  });
});

describe('resetting a forgotten password', () => {
  const NEW_PASSWORD = 'another-long-enough-password';

  const linkToken = (): string => {
    const token = /token=([a-f0-9]{64})/.exec(api.mails().at(-1)?.text ?? '')?.[1];
    if (token === undefined) throw new Error('No reset link was sent.');

    return token;
  };

  it('answers the same for an address it knows and one it does not', async () => {
    await api.signUp(EMAIL, PASSWORD);
    const sentSoFar = api.mails().length;

    const known = await api.post('/auth/forgot-password', { email: EMAIL });
    const unknown = await api.post('/auth/forgot-password', { email: 'nobody@example.com' });

    expect(known.statusCode).toBe(204);
    expect(unknown.statusCode).toBe(204);
    // One message, not two: the answers match but the behaviour does not.
    expect(api.mails()).toHaveLength(sentSoFar + 1);
  });

  it('sets the new password and refuses the old one', async () => {
    await api.signUp(EMAIL, PASSWORD);
    await api.post('/auth/forgot-password', { email: EMAIL });

    const reset = await api.post('/auth/reset-password', {
      token: linkToken(),
      password: NEW_PASSWORD,
    });

    expect(reset.statusCode).toBe(200);
    expect(reset.cookies.find((cookie): boolean => cookie.name === 'session')).toBeDefined();
    expect(
      (await api.post('/auth/login', { email: EMAIL, password: NEW_PASSWORD })).statusCode,
    ).toBe(200);
    expect((await api.post('/auth/login', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      401,
    );
  });

  it('cuts the sessions that were open before it', async () => {
    // The reason a reset exists: somebody else is already signed in, and
    // changing the password has to put them out. A JWT cannot be recalled, so
    // this is the one behaviour worth proving rather than assuming.
    const oldSession = await api.signUp(EMAIL, PASSWORD);
    expect(
      (await api.graphql<{ me: { id: string } }>('query { me { id } }', undefined, oldSession))
        .data,
    ).toBeDefined();

    await api.post('/auth/forgot-password', { email: EMAIL });
    await api.post('/auth/reset-password', { token: linkToken(), password: NEW_PASSWORD });

    const after = await api.graphql<{ me: { id: string } }>(
      'query { me { id } }',
      undefined,
      oldSession,
    );

    expect(after.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('leaves the session it just handed out working', async () => {
    await api.signUp(EMAIL, PASSWORD);
    await api.post('/auth/forgot-password', { email: EMAIL });

    const reset = await api.post('/auth/reset-password', {
      token: linkToken(),
      password: NEW_PASSWORD,
    });
    const session = reset.cookies.find((cookie): boolean => cookie.name === 'session');

    // A JWT records its issue time in whole seconds, so a cut-off measured in
    // milliseconds would refuse the very session the reset just opened.
    const response = await api.graphql<{ me: { id: string } }>(
      'query { me { id } }',
      undefined,
      `session=${session?.value ?? ''}`,
    );

    expect(response.data?.me.id).toBeDefined();
  });

  it('spends the link, so the message cannot be replayed', async () => {
    await api.signUp(EMAIL, PASSWORD);
    await api.post('/auth/forgot-password', { email: EMAIL });
    const token = linkToken();
    await api.post('/auth/reset-password', { token, password: NEW_PASSWORD });

    const second = await api.post('/auth/reset-password', { token, password: 'yet-another-one' });

    expect(second.statusCode).toBe(401);
  });

  it('confirms an address that never was, since the link proves it', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });
    expect((await api.post('/auth/login', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      403,
    );

    await api.post('/auth/forgot-password', { email: EMAIL });
    await api.post('/auth/reset-password', { token: linkToken(), password: NEW_PASSWORD });

    // Reaching the link is the same proof the verification mail asks for, so
    // insisting on that one as well would be theatre.
    expect(
      (await api.post('/auth/login', { email: EMAIL, password: NEW_PASSWORD })).statusCode,
    ).toBe(200);
  });

  it('refuses a new password too short to be worth hashing', async () => {
    await api.signUp(EMAIL, PASSWORD);
    await api.post('/auth/forgot-password', { email: EMAIL });

    const response = await api.post('/auth/reset-password', {
      token: linkToken(),
      password: 'short',
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('signing in', () => {
  it('accepts the right password once the address has been confirmed', async () => {
    await api.signUp(EMAIL, PASSWORD);

    const response = await api.post('/auth/login', { email: EMAIL, password: PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ email: EMAIL });
  });

  it('refuses the right password while the address is unconfirmed', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const response = await api.post('/auth/login', { email: EMAIL, password: PASSWORD });

    // 403 rather than 401, so the front can offer a new link instead of
    // insisting the password was wrong. It is only reachable by someone who
    // typed the right password, which is who has earned that answer.
    expect(response.statusCode).toBe(403);
  });

  it('tells a wrong password and an unknown address apart to nobody', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const wrongPassword = await api.post('/auth/login', {
      email: EMAIL,
      password: 'wrong-password',
    });
    const unknownAddress = await api.post('/auth/login', {
      email: 'nobody@example.com',
      password: PASSWORD,
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownAddress.statusCode).toBe(401);
    expect(messageOf(wrongPassword.body)).toBe(messageOf(unknownAddress.body));
  });

  it('expires the cookie on the way out', async () => {
    const cookie = await registerAndSignIn();

    const response = await api.post('/auth/logout', undefined, cookie);

    expect(response.statusCode).toBe(204);
    expect(response.cookies.find((entry): boolean => entry.name === 'session')?.maxAge).toBe(0);
  });
});

describe('the signed-in user', () => {
  it('is served to whoever carries the session', async () => {
    const cookie = await registerAndSignIn();

    const response = await api.graphql<{ me: { email: string } }>(ME, undefined, cookie);

    expect(response.data?.me.email).toBe(EMAIL);
  });

  it('is refused without a session', async () => {
    const response = await api.graphql(ME);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('is refused when the session names an account that no longer exists', async () => {
    const cookie = await registerAndSignIn();
    await api.reset();

    const response = await api.graphql(ME, undefined, cookie);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('is refused when the token has been tampered with', async () => {
    const cookie = await registerAndSignIn();

    const response = await api.graphql(ME, undefined, `${cookie}tampered`);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });
});

describe('signing in with Google', () => {
  it('sends the browser to Google with a state it can check on the way back', async () => {
    const response = await api.get('/auth/google');

    const location = String(response.headers.location);
    const state = response.cookies.find((cookie): boolean => cookie.name === 'oauth_state');

    expect(response.statusCode).toBe(302);
    expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location).toContain('client_id=test-google-client-id');
    expect(location).toContain(encodeURIComponent('http://localhost:3779/auth/google/callback'));
    expect(state?.value).toBeTruthy();
    expect(location).toContain(`state=${state?.value}`);
  });

  it('refuses a callback whose state does not match the one it issued', async () => {
    const started = await api.get('/auth/google');
    const state = started.cookies.find((cookie): boolean => cookie.name === 'oauth_state');

    const response = await api.get(
      '/auth/google/callback?code=whatever&state=someone-elses-state',
      `oauth_state=${state?.value}`,
    );

    expect(response.statusCode).toBe(401);
  });

  it('refuses a callback that carries no state at all', async () => {
    const response = await api.get('/auth/google/callback?code=whatever');

    expect(response.statusCode).toBe(401);
  });
});
