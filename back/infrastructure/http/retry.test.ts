import { describe, expect, it } from 'vitest';
import {
  backoffDelay,
  isTransientStatus,
  retryAfterMs,
  retryTransient,
  type Transient,
} from './retry';

const always = (): Transient => ({});
const never = (): undefined => undefined;

const failing = (failures: number): { run: () => Promise<string>; calls: () => number } => {
  let calls = 0;
  return {
    run: (): Promise<string> => {
      calls += 1;
      return calls <= failures
        ? Promise.reject(new Error(`failure ${calls}`))
        : Promise.resolve('done');
    },
    calls: (): number => calls,
  };
};

const recordingSleep = (): { sleeps: number[]; sleep: (ms: number) => Promise<void> } => {
  const sleeps: number[] = [];
  return {
    sleeps,
    sleep: (ms: number): Promise<void> => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };
};

describe('the backoff delay', () => {
  const options = { baseDelayMs: 100, maxDelayMs: 1000 };

  it.each([
    [0, 0.5, 50],
    [1, 0.5, 100],
    [2, 0.5, 200],
    [3, 0.999, 799],
  ])('on attempt %i with random %f waits %i ms', (attempt, random, expected) => {
    expect(backoffDelay(attempt, { ...options, random: () => random })).toBe(expected);
  });

  it('never reaches the cap, however many attempts', () => {
    expect(backoffDelay(30, { ...options, random: () => 0.999999 })).toBeLessThan(1000);
  });

  it('can be nothing at all when the dice say so', () => {
    expect(backoffDelay(4, { ...options, random: () => 0 })).toBe(0);
  });
});

describe('the Retry-After header', () => {
  it.each([
    ['a number of seconds', '3', 0, 3000],
    ['an HTTP date', 'Thu, 01 Jan 1970 00:00:05 GMT', 2000, 3000],
    ['a date already past', 'Thu, 01 Jan 1970 00:00:01 GMT', 5000, 0],
  ])('reads %s', (_name, header, now, expected) => {
    expect(retryAfterMs(header, now)).toBe(expected);
  });

  it.each([undefined, '', 'soon', 42])('ignores %j', (header) => {
    expect(retryAfterMs(header)).toBeUndefined();
  });
});

describe('which statuses are transient', () => {
  it.each([408, 429, 502, 503, 504])('retries %i', (status) => {
    expect(isTransientStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 422, 500, 501])('never retries %i', (status) => {
    expect(isTransientStatus(status)).toBe(false);
  });
});

describe('retrying a transient failure', () => {
  it('returns the first answer without waiting when nothing fails', async () => {
    const { sleeps, sleep } = recordingSleep();

    await expect(retryTransient(failing(0).run, always, { sleep })).resolves.toBe('done');
    expect(sleeps).toEqual([]);
  });

  it('waits a jittered, doubling delay between attempts until one succeeds', async () => {
    const { sleeps, sleep } = recordingSleep();
    const operation = failing(2);

    const result = await retryTransient(operation.run, always, {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      random: () => 0.5,
      sleep,
    });

    expect(result).toBe('done');
    expect(operation.calls()).toBe(3);
    expect(sleeps).toEqual([50, 100]);
  });

  it('stops at the maximum number of attempts and throws the last failure', async () => {
    const { sleeps, sleep } = recordingSleep();
    const operation = failing(10);

    await expect(retryTransient(operation.run, always, { maxAttempts: 3, sleep })).rejects.toThrow(
      'failure 3',
    );
    expect(operation.calls()).toBe(3);
    expect(sleeps).toHaveLength(2);
  });

  it('caps every wait', async () => {
    const { sleeps, sleep } = recordingSleep();

    await retryTransient(failing(5).run, always, {
      maxAttempts: 6,
      baseDelayMs: 1000,
      maxDelayMs: 1500,
      random: () => 0.9999,
      sleep,
    });

    expect(Math.max(...sleeps)).toBeLessThan(1500);
  });

  it('does not retry a failure the classifier refuses (a 4xx, a bug)', async () => {
    const { sleeps, sleep } = recordingSleep();
    const operation = failing(1);

    await expect(retryTransient(operation.run, never, { sleep })).rejects.toThrow('failure 1');
    expect(operation.calls()).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it('honours Retry-After when it asks for more than the jitter', async () => {
    const { sleeps, sleep } = recordingSleep();

    await retryTransient(failing(1).run, () => ({ retryAfterMs: 1200 }), {
      baseDelayMs: 100,
      maxDelayMs: 2000,
      random: () => 0,
      sleep,
    });

    expect(sleeps).toEqual([1200]);
  });

  it('gives up at once when the server asks to wait longer than the cap', async () => {
    const { sleeps, sleep } = recordingSleep();
    const operation = failing(1);

    await expect(
      retryTransient(operation.run, () => ({ retryAfterMs: 60_000 }), { maxDelayMs: 2000, sleep }),
    ).rejects.toThrow('failure 1');
    expect(operation.calls()).toBe(1);
    expect(sleeps).toEqual([]);
  });
});
