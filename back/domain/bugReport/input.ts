import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BugSeverity, BugStatus } from './enum';

// Long enough to say something, short enough that the column cannot be used as
// storage. "It doesn't work" is ten characters and is still a real report.
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

// The browser fills these in. They are still validated: they arrive from a
// client, and a client is never a reason to trust a string.
const MAX_CONTEXT_FIELD = 400;

@InputType()
export class BugContextInput {
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
export class ReportBugInput {
  @Field(() => BugSeverity)
  @IsEnum(BugSeverity)
  severity!: BugSeverity;

  @Field(() => String, { description: 'What went wrong, in the reader own words.' })
  @IsString()
  @MinLength(MIN_MESSAGE)
  @MaxLength(MAX_MESSAGE)
  message!: string;

  @Field(() => BugContextInput)
  @ValidateNested()
  @Type(() => BugContextInput)
  context!: BugContextInput;
}

@InputType()
export class BlockReporterInput {
  @Field(() => String, { description: 'A report by the account to act on.' })
  @IsUUID()
  reportId!: string;

  @Field(() => Boolean)
  @IsBoolean()
  blocked!: boolean;
}

@InputType()
export class BugStatusInput {
  @Field(() => String)
  @IsUUID()
  id!: string;

  @Field(() => BugStatus)
  @IsEnum(BugStatus)
  status!: BugStatus;
}
