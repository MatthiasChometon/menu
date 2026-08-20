import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { credentialConstraints } from '../utils';

const { minPasswordLength, maxPasswordLength, maxNameLength } = credentialConstraints();

export class RegisterInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(minPasswordLength)
  @MaxLength(maxPasswordLength)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(maxNameLength)
  name?: string;

  // Remembered rather than re-read later: the verification mail is often sent
  // from a request carrying nothing but an address, and one in the wrong
  // language reads exactly like a phishing attempt.
  @IsOptional()
  @IsIn(['fr', 'en'])
  locale?: string;
}

export class LoginInput {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
