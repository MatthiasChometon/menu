import { describe, expect, it } from 'vitest';
import { useAttempt } from './useAttempt';

describe('useAttempt', () => {
  it('keeps the failure flagged while the next round is still running, then clears it on success', async () => {
    const { hasFailed, run } = useAttempt();
    await run((): Promise<void> => Promise.reject(new Error('offline')));
    expect(hasFailed.value).toBe(true);

    let finish: () => void = () => undefined;
    const second = run(
      (): Promise<void> =>
        new Promise<void>((resolve): void => {
          finish = resolve;
        }),
    );

    expect(hasFailed.value).toBe(true);
    finish();
    await second;
    expect(hasFailed.value).toBe(false);
  });

  it('stays failed when the next round fails too', async () => {
    const { hasFailed, run } = useAttempt();
    await run((): Promise<void> => Promise.reject(new Error('offline')));
    await run((): Promise<void> => Promise.reject(new Error('still offline')));

    expect(hasFailed.value).toBe(true);
  });
});
