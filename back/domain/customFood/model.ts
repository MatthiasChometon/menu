import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A food its owner defined for themselves, per 100 g.' })
export class CustomFood {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  kcal!: number;

  @Field(() => Float)
  protein!: number;

  @Field(() => Float)
  fat!: number;

  @Field(() => Float)
  carbs!: number;

  @Field(() => Float)
  fiber!: number;

  @Field(() => Float)
  pricePerKg!: number;
}
