import { describe, expect, it, vi } from 'vitest';
import { createPollTick, ensurePollAlarm, POLL_ALARM, POLL_JITTER_MS } from './poll';

describe('the poll alarm', () => {
  it('is created, periodic, when it does not exist', async () => {
    const create = vi.fn().mockResolvedValue(undefined);

    await ensurePollAlarm({ get: () => Promise.resolve(undefined), create });

    expect(create).toHaveBeenCalledWith(POLL_ALARM, { periodInMinutes: 5, delayInMinutes: 1 });
  });

  it('is left alone when the browser kept it', async () => {
    const create = vi.fn();

    await ensurePollAlarm({ get: () => Promise.resolve({ name: POLL_ALARM }), create });

    expect(create).not.toHaveBeenCalled();
  });
});

describe('a poll tick', () => {
  it('waits a jittered moment, below the cap, before running', async () => {
    const order: string[] = [];
    const tick = createPollTick({
      runOnce: (): Promise<void> => {
        order.push('run');
        return Promise.resolve();
      },
      onError: vi.fn(),
      sleep: (ms): Promise<void> => {
        order.push(`sleep ${ms}`);
        return Promise.resolve();
      },
      random: () => 0.5,
    });

    await tick();

    expect(order).toEqual([`sleep ${POLL_JITTER_MS / 2}`, 'run']);
  });

  it('reports a failing run and still runs at the next tick', async () => {
    const runOnce = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('shop unreachable'))
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    const tick = createPollTick({ runOnce, onError, sleep: () => Promise.resolve() });

    await tick();
    await tick();

    expect(onError).toHaveBeenCalledOnce();
    expect(runOnce).toHaveBeenCalledTimes(2);
  });
});
