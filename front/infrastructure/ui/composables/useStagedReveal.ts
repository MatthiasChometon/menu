// Blocks that come into view together (the whole first screen of a page) render one per task, not
// all in the same one: a long task counts as blocking time for the part past 50 ms, so the work is
// cut into slices small enough to stay under it. The tasks run in the order they were staged.
type StagedReveal = { stage: (render: () => void) => void };

const queue: (() => void)[] = [];
let isDraining = false;

type SchedulerLike = { yield?: () => Promise<void> };

// `scheduler.yield()` keeps the continuation's priority; setTimeout 0 is the fallback.
const yieldToBrowser = (): Promise<void> => {
  const { scheduler } = globalThis as { scheduler?: SchedulerLike };
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve): void => {
    setTimeout(resolve, 0);
  });
};

// A render that throws is logged and the next ones still run: one broken section must not keep
// the others hidden, and `isDraining` always goes back to false.
const drain = async (): Promise<void> => {
  isDraining = true;
  try {
    await yieldToBrowser();
    while (queue.length > 0) {
      try {
        queue.shift()?.();
      } catch (error) {
        // eslint-disable-next-line no-console -- the only trace of a section that failed to draw
        console.error('[staged reveal] a render failed', error);
      }
      await yieldToBrowser();
    }
  } finally {
    isDraining = false;
  }
};

export const useStagedReveal = (): StagedReveal => ({
  stage: (render: () => void): void => {
    queue.push(render);
    if (!isDraining) drain().catch((): void => undefined);
  },
});
