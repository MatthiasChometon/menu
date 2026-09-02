const STORAGE_KEY = 'onboarding:dismissed';

// One instance for the whole app: two separate useLocalStorage() calls for
// the same key are not guaranteed to see each other's writes right away
// (usePlannerHistory hit the same gotcha), and the home nudge, the walkthrough
// page and its own tests all read this within the same session.
let sharedIsDismissed: Ref<boolean> | undefined;

const isDismissedRef = (): Ref<boolean> => {
  sharedIsDismissed ??= useLocalStorage(STORAGE_KEY, false);
  return sharedIsDismissed;
};

/** Whether the guided walkthrough has already been offered — finished or
 *  explicitly skipped, either way there is no need to propose it again. Kept
 *  on the device rather than the account, so a visitor who has not signed in
 *  yet still only sees the nudge once. The walkthrough itself stays reachable
 *  at any time regardless: this only governs whether it is *offered*. */
export const useOnboardingStatus = (): {
  isDismissed: Ref<boolean>;
  dismiss: () => void;
  reset: () => void;
} => {
  const isDismissed = isDismissedRef();

  return {
    isDismissed,
    dismiss: (): void => {
      isDismissed.value = true;
    },
    reset: (): void => {
      isDismissed.value = false;
    },
  };
};
