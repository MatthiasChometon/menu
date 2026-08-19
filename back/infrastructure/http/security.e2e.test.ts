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
  it('answers a resolver at all with the limiter armed', async () => {
    // Sign in first: the point is a reader who really is signed in being seen
    // as such, which is exactly what production got wrong.
    const cookie = await api.signUp('someone-else@example.com', PASSWORD);

    // The limiter reaches for the request to know who is calling, and under
    // GraphQL it is not where it is under REST. Getting that wrong failed every
    // resolver on a property read, so the API answered 200 with an internal
    // error to every query — a signed-in reader looked signed out and no week
    // could be saved. This file is the only one that arms the limiter, which is
    // why nothing caught it.
    //
    // __typename is deliberately not the query used: it has no resolver, so no
    // guard runs, and it kept answering perfectly throughout.
    const response = await api.graphql<{ me: { id: string } }>(
      'query { me { id } }',
      undefined,
      cookie,
    );

    expect(response.errors).toBeUndefined();
    expect(response.data?.me.id).toBeDefined();
  });

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

  it('stops answering a burst of GraphQL queries too', async () => {
    // The sibling test above proves the guard does not BREAK GraphQL. It never
    // proved the guard COUNTS it, and those are different claims: a limiter
    // that runs and forgets protects nothing. Everything the app actually does
    // — reading a profile, saving a week — goes through GraphQL, so a ceiling
    // that only covers the REST sign-in routes leaves the whole API open.
    // Not the status code: GraphQL answers 200 whatever happens and puts the
    // failure in the body, so asserting on 429 would pass a broken limiter and
    // fail a working one. The refusal has to be read where GraphQL puts it.
    const codes: string[] = [];
    for (let attempt = 0; attempt < 130; attempt += 1) {
      const response = await api.graphql<{ me: { id: string } }>('query { me { id } }');
      codes.push(...(response.errors ?? []).map((error): string => String(error.extensions?.code)));
    }

    expect(codes).toContain('TOO_MANY_REQUESTS');
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
