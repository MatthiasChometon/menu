import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'One weigh-in, logged by its owner.' })
export class WeightEntry {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Calendar date the weigh-in happened on, YYYY-MM-DD.' })
  date!: string;

  @Field(() => Float)
  kg!: number;
}
