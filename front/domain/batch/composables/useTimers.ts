// One board for the whole session: timers started from the plan page are still
// running if the cook opens kitchen mode, because both read the same store.
let timersStore: Ref<Timer[]> | undefined;

const timersRef = (): Ref<Timer[]> => {
  if (timersStore === undefined) timersStore = useLocalStorage<Timer[]>('batch:timers', []);

  return timersStore;
};

const remainingOf = (timer: Timer, at: number): number =>
  timer.endAt === undefined ? timer.remainingSeconds : Math.max(0, Math.round((timer.endAt - at) / 1000));

const statusOf = (timer: Timer, remaining: number): TimerStatus => {
  if (remaining <= 0) return 'done';
  if (timer.endAt !== undefined) return 'running';
  if (remaining === timer.durationSeconds) return 'idle';

  return 'paused';
};

const viewOf = (timer: Timer, at: number): TimerView => {
  const remaining = remainingOf(timer, at);

  return {
    id: timer.id,
    label: timer.label,
    durationSeconds: timer.durationSeconds,
    remainingSeconds: remaining,
    status: statusOf(timer, remaining),
  };
};

const updateOne = (timers: Ref<Timer[]>, id: string, update: (timer: Timer) => Timer): void => {
  timers.value = timers.value.map((timer): Timer => (timer.id === id ? update(timer) : timer));
};

export const useTimers = (): {
  timersAt: (at: number) => TimerView[];
  add: (label: string, minutes: number) => void;
  start: (id: string, at?: number) => void;
  pause: (id: string, at?: number) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
} => {
  const timers = timersRef();

  return {
    timersAt: (at: number): TimerView[] => timers.value.map((timer): TimerView => viewOf(timer, at)),
    add: (label: string, minutes: number): void => {
      const durationSeconds = Math.max(1, Math.round(minutes * 60));

      timers.value = [
        ...timers.value,
        { id: crypto.randomUUID(), label, durationSeconds, remainingSeconds: durationSeconds, endAt: undefined },
      ];
    },
    start: (id: string, at = Date.now()): void =>
      updateOne(timers, id, (timer): Timer => {
        const remaining = remainingOf(timer, at);
        if (remaining <= 0) return timer;

        return { ...timer, remainingSeconds: remaining, endAt: at + remaining * 1000 };
      }),
    pause: (id: string, at = Date.now()): void =>
      updateOne(timers, id, (timer): Timer => ({
        ...timer,
        remainingSeconds: remainingOf(timer, at),
        endAt: undefined,
      })),
    reset: (id: string): void =>
      updateOne(timers, id, (timer): Timer => ({
        ...timer,
        remainingSeconds: timer.durationSeconds,
        endAt: undefined,
      })),
    remove: (id: string): void => {
      timers.value = timers.value.filter((timer): boolean => timer.id !== id);
    },
    clear: (): void => {
      timers.value = [];
    },
  };
};
