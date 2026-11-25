import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createJob, readJob } = vi.hoisted(() => ({ createJob: vi.fn(), readJob: vi.fn() }));

mockNuxtImport('GqlCreateGroceryJob', () => createJob);
mockNuxtImport('GqlGroceryJob', () => readJob);

const queued = { id: 'job-1', status: 'PENDING' };

beforeEach((): void => {
  createJob.mockReset();
  readJob.mockReset();
  vi.useFakeTimers();
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('ordering the groceries', () => {
  it('flags a run that could not be queued, and frees the button', async () => {
    createJob.mockRejectedValue(new Error('network down'));
    const { order, hasFailed, isQueueing } = useGroceryOrder();

    await order('2026-08-24', []);

    expect(hasFailed.value).toBe(true);
    expect(isQueueing.value).toBe(false);
  });

  it('clears the failure when the next attempt goes through', async () => {
    createJob.mockRejectedValueOnce(new Error('network down'));
    createJob.mockResolvedValue({ createGroceryJob: queued });
    readJob.mockResolvedValue({ groceryJob: { ...queued, status: 'SUCCEEDED', events: [] } });
    const { order, hasFailed, stopFollowing } = useGroceryOrder();

    await order('2026-08-24', []);
    await order('2026-08-24', []);

    expect(hasFailed.value).toBe(false);
    stopFollowing();
  });

  it('keeps following a run when one poll fails, and picks up the next answer', async () => {
    readJob.mockRejectedValueOnce(new Error('blip'));
    readJob.mockResolvedValue({ groceryJob: { ...queued, status: 'SUCCEEDED', events: [] } });
    const { job, follow, stopFollowing } = useGroceryOrder();

    follow('job-1');
    await vi.advanceTimersByTimeAsync(20_000);

    // The failed round is not the end of the live view: the next one lands.
    expect(readJob).toHaveBeenCalledTimes(2);
    expect(job.value?.status).toBe('SUCCEEDED');
    stopFollowing();
  });
});
