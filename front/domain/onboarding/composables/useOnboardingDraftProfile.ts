import type { MeasurementsInput } from '#gql';

const STORAGE_KEY = 'onboarding:draft-profile';

// One instance for the whole app, for the same reason as
// useOnboardingStatus: several composable calls for the same
// useLocalStorage() key are not guaranteed to see each other's writes
// straight away.
let sharedDraft: Ref<MeasurementsInput | null> | undefined;

const draftRef = (): Ref<MeasurementsInput | null> => {
  // null, not undefined: the value crosses into storage, the one boundary
  // where null is kept rather than converted away.
  sharedDraft ??= useLocalStorage<MeasurementsInput | null>(STORAGE_KEY, null);
  return sharedDraft;
};

/** Answers gathered before anybody is signed in — held on this device only,
 *  so the walkthrough is worth finishing with no account yet to save them to.
 *  Read back by the profile page once there is somewhere to save them for
 *  real, and cleared the moment they are. */
export const useOnboardingDraftProfile = (): {
  draft: ComputedRef<MeasurementsInput | undefined>;
  save: (answers: MeasurementsInput) => void;
  clear: () => void;
} => {
  const stored = draftRef();

  return {
    draft: computed((): MeasurementsInput | undefined => stored.value ?? undefined),
    save: (answers: MeasurementsInput): void => {
      stored.value = answers;
    },
    clear: (): void => {
      stored.value = null;
    },
  };
};
