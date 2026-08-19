import { IsEmail, IsHexadecimal, IsString, Length } from 'class-validator';

export class VerifyEmailInput {
  // 32 random bytes in hex. Checking the shape here means a malformed token is
  // refused before it ever reaches a database lookup.
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;
}

export class ResendVerificationInput {
  @IsEmail()
  email!: string;
}
