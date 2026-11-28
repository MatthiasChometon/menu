import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStagedReveal } from './useStagedReveal';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useStagedReveal', () => {
  it('runs the renders in the order they were staged', async () => {
    const order: string[] = [];
    const { stage } = useStagedReveal();

    stage((): void => void order.push('week'));
    stage((): void => void order.push('shopping'));
    stage((): void => void order.push('composer'));

    await vi.waitFor((): void => {
      expect(order).toEqual(['week', 'shopping', 'composer']);
    });
  });

  it('puts every render in a task of its own, with the browser getting a turn between', async () => {
    // A timer chain stands for the browser's other work (input, paint): if two renders ran in the
    // same task, no tick could land between them.
    const events: string[] = [];
    let ticking = true;
    const tick = (): void => {
      events.push('tick');
      if (ticking) setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
    const { stage } = useStagedReveal();

    for (const name of ['a', 'b', 'c']) stage((): void => void events.push(name));
    await vi.waitFor(
      (): void => {
        expect(events.filter((event) => event !== 'tick')).toEqual(['a', 'b', 'c']);
      },
      { timeout: 5000 },
    );
    ticking = false;

    const first = events.indexOf('a');
    const second = events.indexOf('b');
    const third = events.indexOf('c');
    expect(events.slice(first, second)).toContain('tick');
    expect(events.slice(second, third)).toContain('tick');
  });

  it('yields through scheduler.yield when the browser has it', async () => {
    const yielded = vi.fn((): Promise<void> => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yielded });
    const done = vi.fn();
    const { stage } = useStagedReveal();

    stage(done);
    stage(done);

    await vi.waitFor(
      (): void => {
        expect(done).toHaveBeenCalledTimes(2);
      },
      { timeout: 5000 },
    );
    expect(yielded).toHaveBeenCalled();
  });

  it('falls back to setTimeout 0 when scheduler.yield is missing', async () => {
    vi.stubGlobal('scheduler', undefined);
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const done = vi.fn();
    const { stage } = useStagedReveal();

    stage(done);

    await vi.waitFor(
      (): void => {
        expect(done).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 },
    );
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 0);
  });

  it('logs a render that throws and still reveals the next section', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    const error = new Error('broken section');
    const next = vi.fn();
    const later = vi.fn();
    const { stage } = useStagedReveal();

    stage((): void => {
      throw error;
    });
    stage(next);

    await vi.waitFor(
      (): void => {
        expect(next).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 },
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('staged reveal'), error);

    // The queue is usable again afterwards.
    stage(later);
    await vi.waitFor(
      (): void => {
        expect(later).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 },
    );
  });
});
