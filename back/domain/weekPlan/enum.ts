import { registerEnumType } from '@nestjs/graphql';

export enum PlannedDayKey {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum PlannedMealSlot {
  BREAKFAST = 'BREAKFAST',
  POST_WORKOUT = 'POST_WORKOUT',
  LUNCH = 'LUNCH',
  SNACK = 'SNACK',
  DINNER = 'DINNER',
}

registerEnumType(PlannedDayKey, {
  name: 'PlannedDayKey',
  description: 'A day of the planned week, Monday first.',
});

registerEnumType(PlannedMealSlot, {
  name: 'PlannedMealSlot',
  description: 'Which meal of the day a dish fills.',
});
