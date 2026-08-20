import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A stretch of a weekday during which a delivery is welcome.' })
export class GrocerySlotWindow {
  @Field(() => Int, { description: '1 is Monday, 7 is Sunday, as ISO 8601 numbers them.' })
  weekday!: number;

  @Field(() => Int, { description: 'Minutes from midnight.' })
  startMinute!: number;

  @Field(() => Int)
  endMinute!: number;
}
