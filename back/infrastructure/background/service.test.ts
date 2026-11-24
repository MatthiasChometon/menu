import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackgroundTasks } from './service';

afterEach((): void => {
  vi.restoreAllMocks();
});

describe('background tasks', () => {
  it('hands control back before the work is done', async () => {
    const tasks = new BackgroundTasks();
    let release: () => void = (): void => undefined;
    let finished = false;

    tasks.run('slow', async (): Promise<void> => {
      await new Promise<void>((resolve): void => {
        release = resolve;
      });
      finished = true;
    });

    expect(finished).toBe(false);
    release();
    await tasks.settled();
    expect(finished).toBe(true);
  });

  it('logs a failure under its label instead of throwing it', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation((): void => undefined);
    const tasks = new BackgroundTasks();

    tasks.run('announcement', (): Promise<void> => Promise.reject(new Error('connection refused')));

    await expect(tasks.settled()).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledWith('announcement: connection refused');
  });

  it('is waited for when the application shuts down', async () => {
    const tasks = new BackgroundTasks();
    let finished = false;

    tasks.run('late', async (): Promise<void> => {
      await Promise.resolve();
      finished = true;
    });
    await tasks.beforeApplicationShutdown();

    expect(finished).toBe(true);
  });
});
