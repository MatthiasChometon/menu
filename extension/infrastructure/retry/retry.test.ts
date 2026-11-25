import { describe, expect, it } from 'vitest';
import { fetchWithRetry, type RetryOptions } from './retry';

type Step = number | Error | { status: number; headers: Record<string, string> };

// A shop that answers the given steps in order, then 200 for ever.
const scripted = (
  steps: Step[],
): { fetch: RetryOptions['fetch']; calls: () => number; signals: AbortSignal[] } => {
  let calls = 0;
  const signals: AbortSignal[] = [];

  return {
    fetch: (_input, init): Promise<Response> => {
      const step = steps[calls];
      calls += 1;
      if (init.signal) signals.push(init.signal);
      if (step instanceof Error) return Promise.reject(step);
      if (step === undefined) return Promise.resolve(new Response('ok', { status: 200 }));
      if (typeof step === 'number') return Promise.resolve(new Response('', { status: step }));

      return Promise.resolve(new Response('', { status: step.status, headers: step.headers }));
    },
    calls: (): number => calls,
    signals,
  };
};

const recording = (): { sleeps: number[]; sleep: RetryOptions['sleep'] } => {
  const sleeps: number[] = [];
  return {
    sleeps,
    sleep: (ms: number): Promise<void> => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };
};

describe('fetching with retries', () => {
  it('answers at once when the first attempt works', async () => {
    const shop = scripted([]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep });

    expect(response.status).toBe(200);
    expect(sleeps).toEqual([]);
  });

  it('waits a jittered, doubling delay between attempts', async () => {
    const shop = scripted([503, 502]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry(
      '/api/cart',
      {},
      { fetch: shop.fetch, sleep, random: () => 0.5, baseDelayMs: 100, maxDelayMs: 10_000 },
    );

    expect(response.status).toBe(200);
    expect(sleeps).toEqual([50, 100]);
  });

  it('tries again after a network failure and after a timeout', async () => {
    const shop = scripted([
      new TypeError('Failed to fetch'),
      new DOMException('signal timed out', 'TimeoutError'),
    ]);
    const { sleep } = recording();

    const response = await fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep });

    expect(response.status).toBe(200);
    expect(shop.calls()).toBe(3);
  });

  it('stops at the maximum attempts and hands back the last answer', async () => {
    const shop = scripted([503, 503, 503, 503]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry(
      '/api/cart',
      {},
      { fetch: shop.fetch, sleep, maxAttempts: 3 },
    );

    expect(response.status).toBe(503);
    expect(shop.calls()).toBe(3);
    expect(sleeps).toHaveLength(2);
  });

  it('throws the last network failure once the attempts are used up', async () => {
    const shop = scripted([new TypeError('a'), new TypeError('b'), new TypeError('c')]);
    const { sleep } = recording();

    await expect(
      fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep, maxAttempts: 3 }),
    ).rejects.toThrow('c');
  });

  it.each([400, 401, 403, 404, 500])('never retries a %i', async (status) => {
    const shop = scripted([status]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep });

    expect(response.status).toBe(status);
    expect(shop.calls()).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it('does not retry an error of our own (not a network failure)', async () => {
    const shop = scripted([new RangeError('a bug')]);
    const { sleep } = recording();

    await expect(fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep })).rejects.toThrow(
      'a bug',
    );
    expect(shop.calls()).toBe(1);
  });

  it('honours Retry-After when it asks for more than the jitter', async () => {
    const shop = scripted([{ status: 429, headers: { 'retry-after': '2' } }]);
    const { sleeps, sleep } = recording();

    await fetchWithRetry(
      '/api/cart',
      {},
      { fetch: shop.fetch, sleep, random: () => 0, maxDelayMs: 5000 },
    );

    expect(sleeps).toEqual([2000]);
  });

  it('does not wait longer than the cap when the shop asks for a long pause', async () => {
    const shop = scripted([{ status: 429, headers: { 'retry-after': '600' } }]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry(
      '/api/cart',
      {},
      { fetch: shop.fetch, sleep, maxDelayMs: 3000 },
    );

    expect(response.status).toBe(429);
    expect(shop.calls()).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it('gives every attempt its own deadline', async () => {
    const shop = scripted([503]);
    const { sleep } = recording();

    await fetchWithRetry('/api/cart', {}, { fetch: shop.fetch, sleep });

    expect(shop.signals).toHaveLength(2);
    expect(shop.signals[0]).not.toBe(shop.signals[1]);
  });

  it('with a single attempt, never retries', async () => {
    const shop = scripted([503]);
    const { sleeps, sleep } = recording();

    const response = await fetchWithRetry(
      '/graphql',
      {},
      { fetch: shop.fetch, sleep, maxAttempts: 1 },
    );

    expect(response.status).toBe(503);
    expect(sleeps).toEqual([]);
  });

  it('keeps the caller own signal: aborting it cancels the call', async () => {
    const caller = new AbortController();
    const shop = scripted([]);

    await fetchWithRetry(
      '/x',
      { signal: caller.signal },
      { fetch: shop.fetch, sleep: () => Promise.resolve() },
    );
    caller.abort();

    expect(shop.signals[0]?.aborted).toBe(true);
  });
});
