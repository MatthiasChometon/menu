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

  it('logs a request a guard refuses, with its route pattern and never its URL', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');

    await api.post('/images/food/not-called-secret?token=query-secret', {});

    const lines = warn.mock.calls.map(([line]): string => String(line));
    expect(lines).toContainEqual(expect.stringMatching(/^POST \/images\/:kind\/:id 401 \d+ms$/));
    expect(lines.join(' ')).not.toMatch(/not-called-secret|query-secret/);
  });

  it('logs a GraphQL operation by name, without the query text', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');

    await api.graphql('query { googleEnabled }');

    expect(log.mock.calls.map(([line]): string => String(line))).toContainEqual(
      expect.stringMatching(/^Query\.googleEnabled 200 \d+ms$/),
    );
  });
});
