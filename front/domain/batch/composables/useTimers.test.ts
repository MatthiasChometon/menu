import { beforeEach, describe, expect, it, vi } from 'vitest';

const AT = 1_000_000;

// The store lives in localStorage across the whole file, so each test starts
// from a clean board rather than depending on execution order.
beforeEach((): void => {
  useTimers().clear();
});

describe('useTimers', () => {
  it('starts a new timer idle, at its full duration', () => {
    const { add, timersAt } = useTimers();

    add('Riz', 40);
    const [timer] = timersAt(AT);

    expect(timer?.status).toBe('idle');
    expect(timer?.remainingSeconds).toBe(40 * 60);
  });

  it('counts down once started', () => {
    const { add, start, timersAt } = useTimers();

    add('Poulet', 20);
    const id = timersAt(AT)[0]?.id;
    if (id === undefined) throw new Error('no timer added');

    start(id, AT);

    expect(timersAt(AT + 90_000)[0]?.remainingSeconds).toBe(20 * 60 - 90);
    expect(timersAt(AT + 90_000)[0]?.status).toBe('running');
  });

  it('freezes the remaining time on pause, and resumes from there', () => {
    const { add, start, pause, timersAt } = useTimers();

    add('Légumes', 10);
    const id = timersAt(AT)[0]?.id;
    if (id === undefined) throw new Error('no timer added');

    start(id, AT);
    pause(id, AT + 60_000);

    expect(timersAt(AT + 500_000)[0]?.status).toBe('paused');
    expect(timersAt(AT + 500_000)[0]?.remainingSeconds).toBe(10 * 60 - 60);

    start(id, AT + 500_000);
    expect(timersAt(AT + 500_000 + 30_000)[0]?.remainingSeconds).toBe(10 * 60 - 60 - 30);
  });

  it('reaches done once its duration has fully elapsed', () => {
    const { add, start, timersAt } = useTimers();

    add('Quinoa', 1);
    const id = timersAt(AT)[0]?.id;
    if (id === undefined) throw new Error('no timer added');

    start(id, AT);

    expect(timersAt(AT + 120_000)[0]?.status).toBe('done');
    expect(timersAt(AT + 120_000)[0]?.remainingSeconds).toBe(0);
  });

  it('resets a spent timer back to its full duration', () => {
    const { add, start, reset, timersAt } = useTimers();

    add('Lentilles', 5);
    const id = timersAt(AT)[0]?.id;
    if (id === undefined) throw new Error('no timer added');

    start(id, AT);
    reset(id);

    expect(timersAt(AT + 999_999)[0]?.status).toBe('idle');
    expect(timersAt(AT)[0]?.remainingSeconds).toBe(5 * 60);
  });

  it('removes a timer from the board', () => {
    const { add, remove, timersAt } = useTimers();

    add('Sauce', 15);
    const id = timersAt(AT)[0]?.id;
    if (id === undefined) throw new Error('no timer added');

    remove(id);

    expect(timersAt(AT)).toHaveLength(0);
  });

  // The board is a singleton read from localStorage once: a fresh module is the
  // only way to see what it makes of what a previous visit left behind.
  describe('what an earlier visit left in the browser', () => {
    const freshBoard = async (stored: unknown): Promise<TimerView[]> => {
      localStorage.setItem('batch:timers', JSON.stringify(stored));
      vi.resetModules();
      const { useTimers: useFreshTimers } = await import('./useTimers');

      return useFreshTimers().timersAt(AT);
    };

    it('keeps timers that are well formed, running or not', async () => {
      const board = await freshBoard([
        { id: 'a', label: 'Riz', durationSeconds: 600, remainingSeconds: 600 },
        { id: 'b', label: 'Pâtes', durationSeconds: 600, remainingSeconds: 600, endAt: AT + 5000 },
      ]);

      expect(board.map((timer): string => timer.status)).toEqual(['idle', 'running']);
    });

    it('starts from an empty board when an entry is not a timer', async () => {
      const board = await freshBoard([
        { id: 'a', label: 'Riz', durationSeconds: 600, remainingSeconds: 600 },
        { id: 'b', label: 'Pâtes', durationSeconds: 'soon', remainingSeconds: 600 },
      ]);

      expect(board).toEqual([]);
    });

    it.each([
      ['a negative duration', { durationSeconds: -600, remainingSeconds: 600 }],
      ['a fractional duration', { durationSeconds: 600.5, remainingSeconds: 600 }],
      ['a negative remaining time', { durationSeconds: 600, remainingSeconds: -1 }],
      ['a fractional remaining time', { durationSeconds: 600, remainingSeconds: 12.5 }],
      ['an end at the epoch', { durationSeconds: 600, remainingSeconds: 600, endAt: 0 }],
      ['a negative end', { durationSeconds: 600, remainingSeconds: 600, endAt: -5 }],
    ])('starts from an empty board when a timer has %s', async (_name, fields) => {
      expect(await freshBoard([{ id: 'a', label: 'Riz', ...fields }])).toEqual([]);
    });

    it('starts from an empty board when the stored value is not a list', async () => {
      expect(await freshBoard({ id: 'a' })).toEqual([]);
    });
  });
});
