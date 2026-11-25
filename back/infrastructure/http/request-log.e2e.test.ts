import { Logger } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { startTestApp, type TestApp } from '../testing/e2e-app';

let api: TestApp;

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the request log of the running app', () => {
  it('logs a REST request with its route, status and duration', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await api.get('/health');

    expect(log.mock.calls.map(([line]): string => String(line))).toContainEqual(
      expect.stringMatching(/^GET \/health 200 \d+ms$/),
    );
  });

  it('logs a GraphQL operation by name, without the query text', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await api.graphql('query { googleEnabled }');

    expect(log.mock.calls.map(([line]): string => String(line))).toContainEqual(
      expect.stringMatching(/^Query\.googleEnabled 200 \d+ms$/),
    );
  });
});
