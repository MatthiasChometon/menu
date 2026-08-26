import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ImprovementImportance, ImprovementStatus } from './enum';

// Long enough to be an idea, short enough that the column cannot be used as
// storage. "A dark mode" is ten characters and is a real request.
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

// The browser fills these in. Still validated: they arrive from a client, and a
// client is never a reason to trust a string.
const MAX_CONTEXT_FIELD = 400;

@InputType()
export class SuggestionContextInput {
  @Field(() => String)
  @IsString()
  @MaxLength(MAX_CONTEXT_FIELD)
  page!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(MAX_CONTEXT_FIELD)
  userAgent!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(64)
  viewport!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(32)
  locale!: string;
}

@InputType()
export class RequestImprovementInput {
  @Field(() => ImprovementImportance)
  @IsEnum(ImprovementImportance)
  importance!: ImprovementImportance;

  @Field(() => String, { description: 'The idea, in the person own words.' })
  @IsString()
  @MinLength(MIN_MESSAGE)
  @MaxLength(MAX_MESSAGE)
  message!: string;

  @Field(() => SuggestionContextInput)
  @ValidateNested()
  @Type(() => SuggestionContextInput)
  context!: SuggestionContextInput;
}

@InputType()
export class ImprovementStatusInput {
  @Field(() => String)
  @IsUUID()
  id!: string;

  @Field(() => ImprovementStatus)
  @IsEnum(ImprovementStatus)
  status!: ImprovementStatus;
}
