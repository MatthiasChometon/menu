import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

describe('the health check the platform polls', () => {
  it('answers a plain GET with a success status', async () => {
    const response = await api.get('/health');

    // The whole point of the endpoint. Anything but a 2xx and the platform
    // stops routing traffic to the service, which is how the API went dark.
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('reports ready once the database answers', async () => {
    const response = await api.get('/health/ready');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });
});
