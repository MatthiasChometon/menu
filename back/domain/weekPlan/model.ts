import { Field, ObjectType } from '@nestjs/graphql';
import { PlannedDayKey, PlannedMealSlot } from './enum';

@ObjectType({ description: 'One dish chosen for one meal.' })
export class PlannedMeal {
  @Field(() => PlannedMealSlot)
  slot!: PlannedMealSlot;

  @Field(() => String, { description: 'Identifier of a recipe in the site content.' })
  recipeId!: string;
}

@ObjectType({ description: 'What was chosen for one day. Missing meals are simply absent.' })
export class PlannedDay {
  @Field(() => PlannedDayKey)
  day!: PlannedDayKey;

  @Field(() => [PlannedMeal])
  meals!: PlannedMeal[];
}

@ObjectType({
  description:
    'A week composed by its owner. Only the choices are kept: the grammes follow from the profile, so storing them would freeze figures that must move with it.',
})
export class WeekPlan {
  @Field(() => String, { description: 'The Monday of the week, YYYY-MM-DD.' })
  weekOf!: string;

  @Field(() => [PlannedDay])
  days!: PlannedDay[];

  @Field(() => String)
  updatedAt!: string;
}
