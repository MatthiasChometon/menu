import { IsEmail, IsHexadecimal, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { credentialConstraints } from '../utils';

const { minPasswordLength, maxPasswordLength } = credentialConstraints();

export class ForgotPasswordInput {
  @IsEmail()
  email!: string;
}

export class ResetPasswordInput {
  // 32 random bytes in hex. Checking the shape here refuses a malformed token
  // before it reaches a database lookup.
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;

  @IsString()
  @MinLength(minPasswordLength)
  @MaxLength(maxPasswordLength)
  password!: string;
}
