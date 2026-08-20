import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { MeasurementsInput } from '../profile/input';
import { householdConstraints } from './utils';

const { maxNameLength } = householdConstraints();

@InputType({ description: 'A person to cook for: a name, and the answers everyone else gives.' })
export class HouseholdMemberInput extends MeasurementsInput {
  // Trimmed before it is judged: a name of three spaces is not a name, and
  // class-validator's emptiness check would let it through untouched.
  @Field()
  @Transform(({ value }): unknown => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(maxNameLength)
  name!: string;
}

@InputType()
export class UpdateHouseholdMemberInput extends HouseholdMemberInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;
}
