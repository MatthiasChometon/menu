import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';

const EMAIL = 'matthias@example.com';
const PASSWORD = 'a-long-enough-password';

let api: TestApp;

beforeAll(async (): Promise<void> => {
  // The rest of the suite runs with the limiter off so it can sign in freely.
  // This file is the one that checks the limiter, so it arms it — read at app
  // creation, which is why it can be set here rather than in the vitest config.
  process.env.THROTTLE_SKIP = 'false';
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('the answers the server sends', () => {
  it('carries the headers that stop a browser guessing', async () => {
    const response = await api.get('/graphql');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  it('never advertises the framework it runs on', async () => {
    const response = await api.get('/graphql');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('who may talk to the API', () => {
  it('greets an origin it was told about', async () => {
    const response = await api.get('/graphql', undefined, { origin: 'http://localhost:3777' });

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3777');
  });

  it('does not hand credentials to an origin it has never heard of', async () => {
    const response = await api.get('/graphql', undefined, { origin: 'https://evil.example' });

    // The absence is the point: reflecting the caller back is what would let
    // that page read an authenticated answer.
    expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});

describe('what the API refuses to do', () => {
  it('stops answering after a burst of sign-in attempts', async () => {
    await api.post('/auth/register', { email: EMAIL, password: PASSWORD });

    const codes: number[] = [];
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await api.post('/auth/login', { email: EMAIL, password: 'wrong-password' });
      codes.push(response.statusCode);
    }

    // Guessing has to become pointless well before the password space does.
    expect(codes).toContain(429);
  });

  it('drops a field the input never declared instead of trusting it', async () => {
    const response = await api.post('/auth/register', {
      email: EMAIL,
      password: PASSWORD,
      // A column the caller has no business setting.
      googleId: 'injected-by-the-client',
    });

    expect(response.statusCode).toBe(400);
  });

  it('refuses a query nested deeper than any real one', async () => {
    const nested = 'me { '.repeat(12) + 'id' + ' }'.repeat(12);

    const response = await api.graphql(`query { ${nested} }`);

    expect(response.errors?.[0]?.message).toMatch(/deeply nested|Cannot query/i);
  });

  it('keeps its schema to itself unless introspection was asked for', async () => {
    const response = await api.graphql<{ __schema: unknown }>(
      'query { __schema { types { name } } }',
    );

    // The suite runs with introspection off, as a deployment does.
    expect(response.data?.__schema).toBeUndefined();
    expect(response.errors?.[0]?.message).toBeDefined();
  });
});
