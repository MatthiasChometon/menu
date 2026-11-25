import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollWithJitter } from './pollWithJitter';

// The jitter itself is tested on its own; here the waits are exact.
vi.mock('./jitteredInterval', () => ({ jitteredInterval: (ms: number): number => ms }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('polling with jitter', () => {
  it('runs the task after each interval, not before', async () => {
    const task = vi.fn((): Promise<void> => Promise.resolve());
    const stop = pollWithJitter(task, 1000, vi.fn());

    await vi.advanceTimersByTimeAsync(999);
    expect(task).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
  });

  it('waits for a slow run to end before waiting for the next one', async () => {
    let finish: () => void = (): void => {};
    const task = vi.fn(
      (): Promise<void> =>
        new Promise((resolve): void => {
          finish = resolve;
        }),
    );
    const stop = pollWithJitter(task, 1000, vi.fn());

    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);

    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
  });

  it('reports a failing run and keeps going', async () => {
    const failure = new Error('network');
    const task = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    const stop = pollWithJitter(task, 1000, onError);

    await vi.advanceTimersByTimeAsync(3000);

    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(task.mock.calls.length).toBeGreaterThanOrEqual(2);
    stop();
  });

  it('stops for good once stopped', async () => {
    const task = vi.fn((): Promise<void> => Promise.resolve());
    const stop = pollWithJitter(task, 1000, vi.fn());

    stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(task).not.toHaveBeenCalled();
  });
});
