import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BugSeverity, BugStatus } from './enum';

@ObjectType({ description: 'What the browser told us, so nobody had to type it.' })
export class BugContext {
  @Field(() => String)
  page!: string;

  @Field(() => String)
  userAgent!: string;

  @Field(() => String)
  viewport!: string;

  @Field(() => String)
  locale!: string;
}

@ObjectType({ description: 'Something a reader ran into and took the trouble to describe.' })
export class BugReport {
  @Field(() => ID)
  id!: string;

  @Field(() => BugSeverity)
  severity!: BugSeverity;

  @Field(() => String)
  message!: string;

  @Field(() => BugContext)
  context!: BugContext;

  @Field(() => BugStatus)
  status!: BugStatus;

  // The address rather than the account id: reading a list, what you want to
  // know is who to answer. Null when the account has since been closed.
  @Field(() => String, { nullable: true })
  reportedBy!: string | null;

  // Shown on the screen so the same list that reveals a flood is the one where
  // it gets stopped.
  @Field(() => Boolean, { description: 'Whether that account may still send reports.' })
  reporterBlocked!: boolean;

  @Field(() => String)
  createdAt!: string;
}
