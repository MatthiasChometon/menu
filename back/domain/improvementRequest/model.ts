import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ImprovementImportance, ImprovementStatus } from './enum';

@ObjectType({ description: 'What the browser told us, so nobody had to type it.' })
export class SuggestionContext {
  @Field(() => String)
  page!: string;

  @Field(() => String)
  userAgent!: string;

  @Field(() => String)
  viewport!: string;

  @Field(() => String)
  locale!: string;
}

@ObjectType({ description: 'Something a reader wished the site did, and took the time to ask for.' })
export class ImprovementRequest {
  @Field(() => ID)
  id!: string;

  @Field(() => ImprovementImportance)
  importance!: ImprovementImportance;

  @Field(() => String)
  message!: string;

  @Field(() => SuggestionContext)
  context!: SuggestionContext;

  @Field(() => ImprovementStatus)
  status!: ImprovementStatus;

  // The address rather than the account id: reading a list, what you want is who
  // to answer. Null when the account has since been closed.
  @Field(() => String, { nullable: true })
  requestedBy!: string | null;

  @Field(() => String)
  createdAt!: string;
}
