import type { GroceryJobQuery } from '#gql';

export type GroceryJob = NonNullable<GroceryJobQuery['groceryJob']>;

// How often the live view asks again while a run is working. A run is a handful
// of calls, not a long computation, so anything slower would show it finished
// well after it was.
const POLL_MS = 3000;

export const useGroceryOrder = (): {
  job: Ref<GroceryJob | undefined>;
  isQueueing: Ref<boolean>;
  isRunning: ComputedRef<boolean>;
  error: Ref<string | undefined>;
  order: (weekOf: string, needs: { foodId: string; grams: number }[]) => Promise<void>;
  follow: (jobId: string) => void;
  stopFollowing: () => void;
} => {
  const job = ref<GroceryJob | undefined>();
  const isQueueing = ref(false);
  const error = ref<string | undefined>();
  const timer = ref<ReturnType<typeof setInterval> | undefined>();

  const isRunning = computed(
    (): boolean => job.value?.status === 'PENDING' || job.value?.status === 'RUNNING',
  );

  const stopFollowing = (): void => {
    if (timer.value !== undefined) {
      clearInterval(timer.value);
      timer.value = undefined;
    }
  };

  const refresh = async (jobId: string): Promise<void> => {
    const result = await GqlGroceryJob({ jobId }).catch((): undefined => undefined);
    job.value = result?.groceryJob ?? job.value;

    if (!isRunning.value) {
      stopFollowing();
    }
  };

  const follow = (jobId: string): void => {
    stopFollowing();
    timer.value = setInterval((): void => {
      void refresh(jobId);
    }, POLL_MS);
  };

  const order = async (
    weekOf: string,
    needs: { foodId: string; grams: number }[],
  ): Promise<void> => {
    isQueueing.value = true;
    error.value = undefined;

    try {
      const result = await GqlCreateGroceryJob({ input: { weekOf, needs } });
      // The queued job carries no events yet; following it is what fills them in.
      job.value = { ...result.createGroceryJob, events: [], finishedAt: undefined };
      follow(result.createGroceryJob.id);
    } catch {
      error.value = 'order.error.queue';
    } finally {
      isQueueing.value = false;
    }
  };

  onScopeDispose(stopFollowing);

  return { job, isQueueing, isRunning, error, order, follow, stopFollowing };
};
