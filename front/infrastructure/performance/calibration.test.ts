import { describe, expect, it } from 'vitest';
import {
  isSteady,
  median,
  readCalibration,
  REFERENCE_BENCHMARK_INDEX,
  slowdownFor,
} from '../../perf-calibration.cjs';

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

  it('rounds the factor to two decimals', () => {
    expect(slowdownFor((REFERENCE_BENCHMARK_INDEX * 1.2345) / 1)).toBe(4.94);
  });

  it('calls a warm-up steady within 15 % of its median, unsteady beyond', () => {
    expect(isSteady([3000, 3200, 2800])).toBe(true);
    expect(isSteady([3000, 3600, 2000])).toBe(false);
  });

  it('takes the median of the warm-up indexes', () => {
    expect(median([1400, 1500, 9000])).toBe(1500);
  });

  it('takes the slowdown pinned by the environment, as CI does', () => {
    expect(readCalibration('missing.json', { PERF_CPU_SLOWDOWN: '4' }).slowdown).toBe(4);
  });

  it('refuses a missing calibration in CI instead of guessing', () => {
    expect(() => readCalibration('missing.json', { CI: 'true' })).toThrow(/PERF_CPU_SLOWDOWN/);
  });

  it('refuses a pinned slowdown that is not a number of at least 1', () => {
    expect(() => readCalibration('missing.json', { PERF_CPU_SLOWDOWN: 'fast' })).toThrow();
  });
});
