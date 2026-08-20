import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GroceryBasketLine } from '../basket/model';
import { GroceryJobEventKind, GroceryJobStatus } from '../enum';
import { GrocerySlotWindow } from '../slot/model';

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

  @Field(() => Int, { nullable: true, description: 'Groceries only, in cents.' })
  productsCents?: number;

  @Field(() => Int, { nullable: true })
  deliveryFeesCents?: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Still missing to reach the shop order minimum. Above zero, nothing can be ordered.',
  })
  shortOfMinimumCents?: number;

  @Field({
    description: 'Whether the basket went over what this account asked to be warned about.',
  })
  overThreshold!: boolean;

  @Field(() => [GroceryJobEvent])
  events!: GroceryJobEvent[];

  @Field(() => [GroceryBasketLine], {
    description: 'What the run is meant to buy, frozen when it was queued.',
  })
  lines!: GroceryBasketLine[];

  // Read when the browser takes the run, not frozen at queue time like the
  // threshold: the slot is booked in the same breath, so what counts is what
  // the account wants now.
  @Field(() => [GrocerySlotWindow], {
    description: 'When a delivery is welcome. Empty means no slot is booked.',
  })
  slotWindows!: GrocerySlotWindow[];
}
