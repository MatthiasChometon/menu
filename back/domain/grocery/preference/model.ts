import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'What this account wants of its orders.' })
export class GroceryPreference {
  @Field(() => Int, {
    nullable: true,
    description: 'Warn when the basket goes above this, in cents. Absent means never warn.',
  })
  alertThresholdCents?: number;
}
