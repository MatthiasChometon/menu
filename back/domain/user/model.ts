import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  // Whether this account can be signed into with a password. A boolean, never
  // the hash: it exists so the interface knows whether to ask for one — an
  // account opened through Google has none to type.
  @Field(() => Boolean)
  hasPassword!: boolean;
}
