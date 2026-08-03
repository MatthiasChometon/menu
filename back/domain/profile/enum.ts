import { registerEnumType } from '@nestjs/graphql';

export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ActivityLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  ACTIVE = 'ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
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

registerEnumType(ActivityLevel, {
  name: 'ActivityLevel',
  description: 'How much the person moves over a week, training included.',
});

registerEnumType(Goal, {
  name: 'Goal',
  description: 'What the person wants their body weight to do.',
});
