export const POLL_ALARM = 'menu-poll';
export const POLL_MINUTES = 5;

// Browsers installed together would claim in step, so each run starts a little
// after its alarm. The alarm itself stays one periodic alarm: it cannot be lost
// by a failing run, which a chain of one-shot alarms would.
// Kept to a few seconds: an MV3 service worker is stopped after ~30 s idle, and a
// long sleep inside the run could be cut off before the work starts.
export const POLL_JITTER_MS = 5_000;

type Alarms = {
  get: (name: string) => Promise<unknown>;
  create: (
    name: string,
    info: { periodInMinutes: number; delayInMinutes: number },
  ) => Promise<void>;
};

// Creates the alarm only when it is missing: the browser keeps it across
// restarts, but a profile that lost it (or a first run) must not stay silent.
export const ensurePollAlarm = async (alarms: Alarms): Promise<void> => {
  if ((await alarms.get(POLL_ALARM)) !== undefined) return;

  await alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES, delayInMinutes: 1 });
};

export type PollDependencies = {
  runOnce: () => Promise<void>;
  onError: (error: unknown) => void;
  /** Injected so a test does not wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected so a test can pin the jitter. */
  random?: () => number;
};

// What one tick of the alarm does: wait a little, run, and report a failure
// instead of throwing it, so the next tick always happens.
export const createPollTick = ({
  runOnce,
  onError,
  sleep = (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    }),
  random = Math.random,
}: PollDependencies): (() => Promise<void>) => {
  return async (): Promise<void> => {
    await sleep(Math.floor(random() * POLL_JITTER_MS));

    try {
      await runOnce();
    } catch (error: unknown) {
      onError(error);
    }
  };
};
