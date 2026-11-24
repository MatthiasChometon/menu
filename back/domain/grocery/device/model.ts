import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A browser allowed to run the orders of an account.' })
export class GroceryDevice {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'What the owner called it, to tell two browsers apart.' })
  label!: string;

  @Field()
  pairedAt!: Date;

  @Field(() => Date, { nullable: true, description: 'Last time it asked for work.' })
  lastSeenAt?: Date | undefined;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether the extension last saw this browser signed in to Carrefour.',
  })
  carrefourSignedIn?: boolean | undefined;

  @Field(() => Date, {
    nullable: true,
    description: 'When the extension last checked the Carrefour session.',
  })
  carrefourCheckedAt?: Date | undefined;
}

@ObjectType({
  description:
    'A freshly paired browser. The token is returned once and never again: it is stored hashed.',
})
export class PairedGroceryDevice {
  @Field(() => GroceryDevice)
  device!: GroceryDevice;

  @Field()
  token!: string;
}
