import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
}

export class LoginInput {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
