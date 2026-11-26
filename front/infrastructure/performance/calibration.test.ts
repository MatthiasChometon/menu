import { describe, expect, it } from 'vitest';
import { median, REFERENCE_BENCHMARK_INDEX, slowdownFor } from '../../perf-calibration.cjs';

describe('perf calibration', () => {
  it('slows a host as fast as the reference down by exactly 4x', () => {
    expect(slowdownFor(REFERENCE_BENCHMARK_INDEX)).toBe(4);
  });

  it('slows a host twice as slow as the reference down by half as much', () => {
    expect(slowdownFor(REFERENCE_BENCHMARK_INDEX / 2)).toBe(2);
  });

  it('never goes under 1x', () => {
    expect(slowdownFor(100)).toBe(1);
  });

  it('slows a faster host down more', () => {
    expect(slowdownFor(REFERENCE_BENCHMARK_INDEX * 1.5)).toBe(6);
  });

  it('takes the median of the warm-up indexes', () => {
    expect(median([1400, 1500, 9000])).toBe(1500);
  });
});
