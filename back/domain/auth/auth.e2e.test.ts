import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';

const EMAIL = 'matthias@example.com';
const PASSWORD = 'a-long-enough-password';

const ME = `query { me { id email name } }`;

let api: TestApp;

const messageOf = (body: string): string => (JSON.parse(body) as { message: string }).message;

const sessionFrom = (cookies: { name: string; value: string }[]): string => {
  const session = cookies.find((cookie): boolean => cookie.name === 'session');
  if (session === undefined) throw new Error('the response carried no session cookie');

  return `session=${session.value}`;
};

const registerAndSignIn = async (): Promise<string> => {
  const response = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

  return sessionFrom(response.cookies);
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

describe('registering', () => {
  it('creates the account and hands back a session', async () => {
    const response = await api.post('/auth/register', {
      email: EMAIL,
      password: PASSWORD,
      name: 'Matthias',
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({ email: EMAIL, name: 'Matthias' });
    expect(response.cookies.find((cookie): boolean => cookie.name === 'session')).toBeDefined();
  });

  it('never exposes the password hash', async () => {
    const response = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain(PASSWORD);
  });

  it('keeps the session cookie out of reach of scripts', async () => {
    const response = await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const session = response.cookies.find((cookie): boolean => cookie.name === 'session');

    expect(session?.httpOnly).toBe(true);
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

describe('signing in', () => {
  it('accepts the right password and opens a session', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const response = await api.post('/auth/login', { email: EMAIL, password: PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ email: EMAIL });
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
