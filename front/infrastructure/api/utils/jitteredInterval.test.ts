import { describe, expect, it } from 'vitest';
import { jitteredInterval } from './jitteredInterval';

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
