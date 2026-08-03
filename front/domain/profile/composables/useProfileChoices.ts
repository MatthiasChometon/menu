import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from '#gql/default';

export type Choice<Value extends string> = {
  value: Value;
  label: string;
  hint?: string;
  icon?: string;
};

export const useProfileChoices = (): {
  goals: ComputedRef<Choice<Goal>[]>;
  sexes: ComputedRef<Choice<Sex>[]>;
  activities: ComputedRef<Choice<DailyActivity>[]>;
  trainingTypes: ComputedRef<Choice<TrainingType>[]>;
  starchQualities: ComputedRef<Choice<StarchQuality>[]>;
  appetites: ComputedRef<Choice<Appetite>[]>;
} => {
  const { t } = useNuxtApp().$i18n;

  return {
    goals: computed((): Choice<Goal>[] => [
      {
        value: Goal.LOSE_FAT,
        label: t('profile.goal.LOSE_FAT'),
        hint: t('profile.goal.LOSE_FAT_hint'),
        icon: 'i-lucide-trending-down',
      },
      {
        value: Goal.MAINTAIN,
        label: t('profile.goal.MAINTAIN'),
        hint: t('profile.goal.MAINTAIN_hint'),
        icon: 'i-lucide-minus',
      },
      {
        value: Goal.GAIN_MUSCLE,
        label: t('profile.goal.GAIN_MUSCLE'),
        hint: t('profile.goal.GAIN_MUSCLE_hint'),
        icon: 'i-lucide-trending-up',
      },
    ]),

    sexes: computed((): Choice<Sex>[] => [
      { value: Sex.FEMALE, label: t('profile.sex.FEMALE') },
      { value: Sex.MALE, label: t('profile.sex.MALE') },
    ]),

    activities: computed((): Choice<DailyActivity>[] => [
      {
        value: DailyActivity.SEATED,
        label: t('profile.dailyActivity.SEATED'),
        hint: t('profile.dailyActivity.SEATED_hint'),
        icon: 'i-lucide-armchair',
      },
      {
        value: DailyActivity.ON_FEET,
        label: t('profile.dailyActivity.ON_FEET'),
        hint: t('profile.dailyActivity.ON_FEET_hint'),
        icon: 'i-lucide-footprints',
      },
      {
        value: DailyActivity.PHYSICAL,
        label: t('profile.dailyActivity.PHYSICAL'),
        hint: t('profile.dailyActivity.PHYSICAL_hint'),
        icon: 'i-lucide-hammer',
      },
    ]),

    trainingTypes: computed((): Choice<TrainingType>[] => [
      {
        value: TrainingType.STRENGTH,
        label: t('profile.training.STRENGTH'),
        icon: 'i-lucide-dumbbell',
      },
      {
        value: TrainingType.CARDIO,
        label: t('profile.training.CARDIO'),
        hint: t('profile.training.CARDIO_hint'),
        icon: 'i-lucide-heart-pulse',
      },
      {
        value: TrainingType.MIXED,
        label: t('profile.training.MIXED'),
        icon: 'i-lucide-shuffle',
      },
    ]),

    starchQualities: computed((): Choice<StarchQuality>[] => [
      {
        value: StarchQuality.WHOLEGRAIN,
        label: t('profile.starchQuality.WHOLEGRAIN'),
        hint: t('profile.starchQuality.WHOLEGRAIN_hint'),
        icon: 'i-lucide-wheat',
      },
      {
        value: StarchQuality.MIXED,
        label: t('profile.starchQuality.MIXED'),
        icon: 'i-lucide-shuffle',
      },
      {
        value: StarchQuality.REFINED,
        label: t('profile.starchQuality.REFINED'),
        hint: t('profile.starchQuality.REFINED_hint'),
        icon: 'i-lucide-croissant',
      },
    ]),

    appetites: computed((): Choice<Appetite>[] => [
      {
        value: Appetite.SMALL,
        label: t('profile.appetite.SMALL'),
        hint: t('profile.appetite.SMALL_hint'),
      },
      { value: Appetite.AVERAGE, label: t('profile.appetite.AVERAGE') },
      {
        value: Appetite.LARGE,
        label: t('profile.appetite.LARGE'),
        hint: t('profile.appetite.LARGE_hint'),
      },
    ]),
  };
};
