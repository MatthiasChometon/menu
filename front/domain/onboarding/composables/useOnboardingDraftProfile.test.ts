import { beforeEach, describe, expect, it } from 'vitest';
import type { MeasurementsInput } from '#gql';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '#gql/default';

const answers: MeasurementsInput = {
  sex: Sex.FEMALE,
  age: 30,
  heightCm: 165,
  weightKg: 60,
  dailyActivity: DailyActivity.SEATED,
  trainingDaysPerWeek: 2,
  trainingType: TrainingType.MIXED,
  starchQuality: StarchQuality.MIXED,
  appetite: Appetite.AVERAGE,
  goal: Goal.MAINTAIN,
};

describe('useOnboardingDraftProfile', () => {
  beforeEach((): void => {
    useOnboardingDraftProfile().clear();
  });

  it('starts with nothing drafted', () => {
    expect(useOnboardingDraftProfile().draft.value).toBeUndefined();
  });

  it('remembers answers saved locally', () => {
    const { save } = useOnboardingDraftProfile();

    save(answers);

    expect(useOnboardingDraftProfile().draft.value).toEqual(answers);
  });

  it('forgets the draft once it is cleared', () => {
    const { save, clear } = useOnboardingDraftProfile();
    save(answers);

    clear();

    expect(useOnboardingDraftProfile().draft.value).toBeUndefined();
  });
});

describe('a corrupted stored draft', () => {
  const corrupt = (raw: string): void => {
    const key = 'onboarding:draft-profile';
    localStorage.setItem(key, raw);
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue: raw, storageArea: localStorage }),
    );
  };

  it('is ignored when it is not an object', () => {
    const { draft, save } = useOnboardingDraftProfile();
    save(answers);

    corrupt(JSON.stringify('nonsense'));

    expect(draft.value).toBeUndefined();
  });

  it('is ignored as a whole when one answer is of the wrong kind', () => {
    const { draft, save } = useOnboardingDraftProfile();
    save(answers);

    corrupt(JSON.stringify({ ...answers, weightKg: 'heavy' }));

    expect(draft.value).toBeUndefined();
  });

  it('is ignored when an answer names a value the API does not know', () => {
    const { draft, save } = useOnboardingDraftProfile();
    save(answers);

    corrupt(JSON.stringify({ ...answers, goal: 'CONQUER' }));

    expect(draft.value).toBeUndefined();
  });
});
