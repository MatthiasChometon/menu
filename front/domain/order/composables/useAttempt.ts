type Attempt = {
  /** The last run failed: the screen says so and offers a retry. */
  hasFailed: Ref<boolean>;
  /** Runs the task; a failure sets `hasFailed` instead of escaping, and only a
   *  success clears it. */
  run: (task: () => Promise<unknown>) => Promise<void>;
};

// "Run it, and flag the failure" in one place. A failed GraphQL operation is
// already reported once by the GraphQL error plugin, so it is not reported again
// here; pass a context only for a task that can fail outside GraphQL (the
// browser's push service, for instance).
export const useAttempt = (reportContext?: string): Attempt => {
  const { reportError } = useErrorReporting();
  const hasFailed = ref(false);

  const run = async (task: () => Promise<unknown>): Promise<void> => {
    try {
      await task();
      // Cleared on success only: a poll that keeps failing must not make the
      // alert blink off at the start of every round.
      hasFailed.value = false;
    } catch (failure) {
      if (reportContext !== undefined) reportError(reportContext, failure);
      hasFailed.value = true;
    }
  };

  return { hasFailed, run };
};
