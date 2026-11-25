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
  hasFailed: Ref<boolean>;
  order: (weekOf: string, needs: { foodId: string; grams: number }[]) => Promise<void>;
  follow: (jobId: string) => void;
  stopFollowing: () => void;
} => {
  const job = ref<GroceryJob | undefined>();
  const isQueueing = ref(false);
  const hasFailed = ref(false);
  const { reportError } = useErrorReporting();
  const stopPolling = ref<(() => void) | undefined>();

  const isRunning = computed(
    (): boolean => job.value?.status === 'PENDING' || job.value?.status === 'RUNNING',
  );

  const stopFollowing = (): void => {
    stopPolling.value?.();
    stopPolling.value = undefined;
  };

  const refresh = async (jobId: string): Promise<void> => {
    // A failed poll is reported by the poller and tried again next round; the
    // last known state stays on screen meanwhile.
    const result = await GqlGroceryJob({ jobId });
    job.value = result.groceryJob ?? job.value;

    if (!isRunning.value) {
      stopFollowing();
    }
  };

  const follow = (jobId: string): void => {
    stopFollowing();
    stopPolling.value = pollWithJitter(
      (): Promise<void> => refresh(jobId),
      POLL_MS,
      (failure: unknown): void => reportError('order:follow', failure),
    );
  };

  const order = async (
    weekOf: string,
    needs: { foodId: string; grams: number }[],
  ): Promise<void> => {
    isQueueing.value = true;
    hasFailed.value = false;

    try {
      const result = await GqlCreateGroceryJob({ input: { weekOf, needs } });
      // The queued job carries no events yet; following it is what fills them in.
      job.value = { ...result.createGroceryJob, events: [] };
      follow(result.createGroceryJob.id);
    } catch (failure) {
      reportError('order:queue', failure);
      hasFailed.value = true;
    } finally {
      isQueueing.value = false;
    }
  };

  onScopeDispose(stopFollowing);

  return { job, isQueueing, isRunning, hasFailed, order, follow, stopFollowing };
};
