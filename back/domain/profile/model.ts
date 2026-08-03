import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Daily nutrition targets worked out from a profile.' })
export class NutritionTargets {
  @Field(() => Int)
  kcal!: number;

  @Field(() => Int, { description: 'Grams of protein per day.' })
  protein!: number;

  @Field(() => Int, { description: 'Grams of fat per day.' })
  fat!: number;

  @Field(() => Int, { description: 'Grams of carbohydrate per day.' })
  carbs!: number;

  @Field(() => Int, { description: 'Grams of fibre per day.' })
  fiber!: number;
}
