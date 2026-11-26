import { describe, expect, it } from 'vitest';
import { measureMedian, medianOf } from './time-budget';

describe('medianOf', () => {
  it('takes the middle value of an odd count', () => {
    expect(medianOf([9, 1, 5])).toBe(5);
  });

  it('averages the two middle values of an even count', () => {
    expect(medianOf([1, 2, 3, 10])).toBe(2.5);
  });

  it('ignores one slow outlier, which is why it is the judged figure', () => {
    expect(medianOf([10, 11, 10, 12, 10_000])).toBe(11);
  });
});

describe('measureMedian', () => {
  it('refuses fewer than ten samples', async () => {
    await expect(
      measureMedian(
        () => Promise.resolve(),
        () => Promise.resolve(),
        3,
      ),
    ).rejects.toThrow('at least 10');
  });

  it('prepares outside the timed part and warms up before counting', async () => {
    let prepared = 0;
    let ran = 0;

    const { durations } = await measureMedian(
      (): Promise<number> => Promise.resolve((prepared += 1)),
      (): Promise<void> => {
        ran += 1;
        return Promise.resolve();
      },
      10,
    );

    expect(prepared).toBe(12);
    expect(ran).toBe(12);
    expect(durations).toHaveLength(10);
  });
});
