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
