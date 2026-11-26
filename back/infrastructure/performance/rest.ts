import { expect } from 'vitest';
import type { Operation } from './operations';
import { PASSWORD, READER_EMAIL } from './world';

const nothing = (): Promise<string> => Promise.resolve('');

let counter = 0;
const fresh = (): number => {
  counter += 1;

  return counter;
};

const newEmail = (): string => `perf-${fresh()}@example.com`;

/** A photograph wider than the site keeps, so the resizing is part of what is timed. */
export const photograph = (): Promise<Buffer> =>
  import('sharp').then(({ default: sharp }): Promise<Buffer> =>
    sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 120, g: 180, b: 40 } },
    })
      .jpeg()
      .toBuffer(),
  );

const rest = (
  name: string,
  budget: Operation['budget'],
  run: Operation['run'],
  prepare: Operation['prepare'] = nothing,
): Operation => ({ name, budget, prepare, run });

// Every REST route of the API. The Google ones are redirects the browser follows: only the
// first answer is the API's to time.
export const buildRest = (photo: Buffer): Operation[] => [
  rest('GET /health', 'read', async (world): Promise<void> => {
    expect((await world.api.get('/health')).statusCode).toBe(200);
  }),
  rest('GET /health/ready', 'read', async (world): Promise<void> => {
    expect((await world.api.get('/health/ready')).statusCode).toBe(200);
  }),
  rest('GET /auth/google', 'read', async (world): Promise<void> => {
    expect((await world.api.get('/auth/google')).statusCode).toBe(302);
  }),
  rest('GET /auth/google/callback', 'read', async (world): Promise<void> => {
    expect((await world.api.get('/auth/google/callback')).statusCode).toBe(401);
  }),
  rest('POST /auth/login', 'credential', async (world): Promise<void> => {
    const response = await world.api.post('/auth/login', {
      email: READER_EMAIL,
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(200);
  }),
  rest('POST /auth/register', 'credential', async (world): Promise<void> => {
    const response = await world.api.post('/auth/register', {
      email: newEmail(),
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(202);
  }),
  rest('POST /auth/logout', 'mutation', async (world): Promise<void> => {
    expect((await world.api.post('/auth/logout', {}, world.cookies.reader)).statusCode).toBe(204);
  }),
  rest('POST /auth/verify-email', 'mutation', async (world): Promise<void> => {
    const response = await world.api.post('/auth/verify-email', { token: 'a'.repeat(64) });
    expect(response.statusCode).toBe(401);
  }),
  rest('POST /auth/resend-verification', 'mutation', async (world): Promise<void> => {
    const response = await world.api.post('/auth/resend-verification', { email: READER_EMAIL });
    expect(response.statusCode).toBe(204);
  }),
  rest('POST /auth/forgot-password', 'mutation', async (world): Promise<void> => {
    const response = await world.api.post('/auth/forgot-password', { email: READER_EMAIL });
    expect(response.statusCode).toBe(204);
  }),
  rest('POST /auth/reset-password', 'credential', async (world): Promise<void> => {
    const response = await world.api.post('/auth/reset-password', {
      token: 'a'.repeat(64),
      password: PASSWORD,
    });
    expect(response.statusCode).toBe(401);
  }),
  rest(
    'POST /auth/delete-account',
    'credential',
    async (world, cookie): Promise<void> => {
      const response = await world.api.post('/auth/delete-account', { password: PASSWORD }, cookie);
      expect(response.statusCode).toBe(204);
    },
    (world): Promise<string> => world.api.signUp(newEmail(), PASSWORD),
  ),
  rest(
    'POST /images/:kind/:id',
    'upload',
    async (world, id): Promise<void> => {
      const response = await world.api.postFile(
        `/images/recipe/${id}`,
        'photo.jpg',
        photo,
        world.cookies.admin,
      );
      expect(response.statusCode).toBe(201);
    },
    (): Promise<string> => Promise.resolve(`perf${fresh()}`),
  ),
];
