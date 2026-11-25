import type { MeasurementsInput } from '#gql';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '#gql/default';

const STORAGE_KEY = 'onboarding:draft-profile';

// One instance for the whole app, for the same reason as
// useOnboardingStatus: several composable calls for the same
// useLocalStorage() key are not guaranteed to see each other's writes
// straight away.
let sharedDraft: Ref<MeasurementsInput | null> | undefined;

const isOneOf = <T extends string>(values: Record<string, T>, candidate: unknown): boolean =>
  Object.values(values).some((value): boolean => value === candidate);

const isCount = (candidate: unknown): boolean =>
  typeof candidate === 'number' && Number.isInteger(candidate);

// Every answer present and of the right kind: the draft is later sent as is to
// save a profile, so a half-readable one would turn into a failed save.
const isDraft = (value: unknown): value is MeasurementsInput => {
  if (typeof value !== 'object' || value === null) return false;
  const fields = new Map<string, unknown>(Object.entries(value));

  return (
    isOneOf(Sex, fields.get('sex')) &&
    isOneOf(DailyActivity, fields.get('dailyActivity')) &&
    isOneOf(TrainingType, fields.get('trainingType')) &&
    isOneOf(StarchQuality, fields.get('starchQuality')) &&
    isOneOf(Appetite, fields.get('appetite')) &&
    isOneOf(Goal, fields.get('goal')) &&
    isCount(fields.get('age')) &&
    isCount(fields.get('heightCm')) &&
    isCount(fields.get('weightKg')) &&
    isCount(fields.get('trainingDaysPerWeek'))
  );
};

const draftRef = (): Ref<MeasurementsInput | null> => {
  // null, not undefined: the value crosses into storage, the one boundary
  // where null is kept rather than converted away.
  sharedDraft ??= useStoredValue().storedValue<MeasurementsInput | null>(
    STORAGE_KEY,
    null,
    (value): value is MeasurementsInput | null => value === null || isDraft(value),
  );
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
