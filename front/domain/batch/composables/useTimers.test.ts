import { beforeEach, describe, expect, it } from 'vitest';

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
});
