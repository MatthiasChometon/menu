import { describe, expect, it } from 'vitest';
import { backoffDelay, isTransientStatus, jitteredInterval, retryAfterMs } from './backoff';

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
});

describe('the polling interval', () => {
  it.each([
    [0, 2400],
    [0.5, 3000],
    [0.999, 3599],
  ])('with random %f waits %i ms around a 3 s interval', (random, expected) => {
    expect(jitteredInterval(3000, () => random)).toBe(expected);
  });

  it('stays within a fifth of the interval with the real random source', () => {
    for (let run = 0; run < 100; run += 1) {
      const wait = jitteredInterval(3000);
      expect(wait).toBeGreaterThanOrEqual(2400);
      expect(wait).toBeLessThanOrEqual(3600);
    }
  });
});

describe('the Retry-After header', () => {
  it.each([
    ['a number of seconds', '3', 0, 3000],
    ['an HTTP date', 'Thu, 01 Jan 1970 00:00:05 GMT', 2000, 3000],
  ])('reads %s', (_name, header, now, expected) => {
    expect(retryAfterMs(header, now)).toBe(expected);
  });

  it.each([null, '', 'soon'])('ignores %j', (header) => {
    expect(retryAfterMs(header)).toBeUndefined();
  });
});

describe('which statuses are transient', () => {
  it.each([408, 429, 502, 503, 504])('retries %i', (status) => {
    expect(isTransientStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 500])('never retries %i', (status) => {
    expect(isTransientStatus(status)).toBe(false);
  });
});
