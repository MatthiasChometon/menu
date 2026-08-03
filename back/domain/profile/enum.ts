import { registerEnumType } from '@nestjs/graphql';

export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum DailyActivity {
  SEATED = 'SEATED',
  ON_FEET = 'ON_FEET',
  PHYSICAL = 'PHYSICAL',
}

export enum TrainingType {
  NONE = 'NONE',
  STRENGTH = 'STRENGTH',
  CARDIO = 'CARDIO',
  MIXED = 'MIXED',
}

export enum StarchQuality {
  WHOLEGRAIN = 'WHOLEGRAIN',
  MIXED = 'MIXED',
  REFINED = 'REFINED',
}

export enum Appetite {
  SMALL = 'SMALL',
  AVERAGE = 'AVERAGE',
  LARGE = 'LARGE',
}

export enum Goal {
  LOSE_FAT = 'LOSE_FAT',
  MAINTAIN = 'MAINTAIN',
  GAIN_MUSCLE = 'GAIN_MUSCLE',
}

registerEnumType(Sex, {
  name: 'Sex',
  description: 'Biological sex, which the resting metabolic rate formula needs.',
});

registerEnumType(DailyActivity, {
  name: 'DailyActivity',
  description:
    'How the day is spent away from training. Asked separately from training so that a desk job and daily sessions can both be true of the same person.',
});

registerEnumType(TrainingType, {
  name: 'TrainingType',
  description:
    'What the sessions are made of; an hour of cardio costs more than an hour of lifting.',
});

registerEnumType(StarchQuality, {
  name: 'StarchQuality',
  description:
    'How refined the starches eaten are. This sets the fibre target: wholegrain starches carry several times the fibre of refined ones.',
});

registerEnumType(Appetite, {
  name: 'Appetite',
  description:
    'How much food the person comfortably eats. It does not move the targets, only how they are spread: a small appetite needs denser meals rather than bigger ones.',
});

registerEnumType(Goal, {
  name: 'Goal',
  description: 'What the person wants their body weight to do.',
});
