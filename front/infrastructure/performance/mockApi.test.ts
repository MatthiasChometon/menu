import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const { mockApi } = createRequire(import.meta.url)('./mock-api.cjs') as {
  mockApi: () => import('node:http').Server;
};

describe('the API Lighthouse talks to', () => {
  const server = mockApi();
  let url = '';

  beforeAll(async () => {
    await new Promise<void>((resolve): void => {
      server.listen(0, '127.0.0.1', resolve);
    });
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/graphql`;
  });
  afterAll(() => {
    server.close();
  });

  it('answers a visitor with UNAUTHENTICATED, as the deployed API does', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { origin: 'http://localhost:3777' },
    });

    const body = (await response.json()) as { errors: { extensions: { code: string } }[] };
    expect(response.status).toBe(200);
    expect(body.errors[0]?.extensions.code).toBe('UNAUTHENTICATED');
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3777');
  });

  it('accepts the CORS preflight', async () => {
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3777',
        'access-control-request-headers': 'content-type,x-demo',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type,x-demo');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });
});
