import { captureException } from '@sentry/vue';
import { createFetch } from 'ofetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiInterceptors } from './apiInterceptors';

vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

// The real chain: ofetch calls the interceptor, throws its own error, and the
// code that caught it reports it too, as the components do.
const apiAnswering = (answer: () => Promise<Response>): typeof $fetch => {
  const { reportError } = useErrorReporting();

  return createFetch({ fetch: answer as unknown as typeof fetch }).create({
    baseURL: 'http://api.test',
    retryDelay: 0,
    ...createApiInterceptors({ expireSession: vi.fn(), report: reportError }),
  }) as typeof $fetch;
};

// The app booting around the test may send its own events; only the ones about
// the calls made here count.
const sentFor = (path: string): unknown[] =>
  vi.mocked(captureException).mock.calls.filter(([, hint]) => {
    const context = (hint as { tags: { context: string } }).tags.context;
    return context.endsWith(path) || context === 'recipes:load' || context === path.slice(1);
  });

beforeEach(() => {
  vi.mocked(captureException).mockClear();
});

describe('a failure met by the interceptor and by the code that caught it', () => {
  it('reaches monitoring once for a 500', async () => {
    const api = apiAnswering(() => Promise.resolve(new Response('{}', { status: 500 })));
    const { reportError } = useErrorReporting();

    await api('/recipes').catch((error: unknown): void => reportError('recipes:load', error));

    expect(sentFor('/recipes')).toHaveLength(1);
  });

  it('reaches monitoring once for a network failure', async () => {
    const api = apiAnswering(() => Promise.reject(new TypeError('Failed to fetch')));
    const { reportError } = useErrorReporting();

    await api('/recipes').catch((error: unknown): void => reportError('recipes:load', error));

    expect(sentFor('/recipes')).toHaveLength(1);
  });

  it('still reports a different failure that follows', async () => {
    const api = apiAnswering(() => Promise.resolve(new Response('{}', { status: 502 })));
    const { reportError } = useErrorReporting();

    await api('/a').catch((error: unknown): void => reportError('a', error));
    await api('/b').catch((error: unknown): void => reportError('b', error));

    expect(sentFor('/a')).toHaveLength(1);
    expect(sentFor('/b')).toHaveLength(1);
  });
});
