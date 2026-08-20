import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';

@ObjectType({ description: 'Something a run reported while it was working.' })
export class GroceryJobEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => GroceryJobEventKind)
  kind!: GroceryJobEventKind;

  @Field()
  at!: Date;

  @Field({
    nullable: true,
    description: 'The food of the menu this concerns, when it is about one.',
  })
  foodId?: string;

  @Field({ nullable: true, description: 'The product as the shop names it.' })
  label?: string;

  @Field({
    nullable: true,
    description: 'Why, in one sentence: what was substituted and for what.',
  })
  detail?: string;
}

@ObjectType({ description: 'One request to fill the basket of a week.' })
export class GroceryJob {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Monday of the week being ordered, as YYYY-MM-DD.' })
  weekOf!: string;

  @Field(() => GroceryJobStatus)
  status!: GroceryJobStatus;

  @Field(() => Int, {
    nullable: true,
    description:
      'Warn above this total, in cents. Copied from the preferences when the run was asked for.',
  })
  alertThresholdCents?: number;

  @Field()
  createdAt!: Date;

  @Field({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field(() => [GroceryJobEvent])
  events!: GroceryJobEvent[];
}
