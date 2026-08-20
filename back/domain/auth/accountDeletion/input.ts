import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountInput {
  // Asked for when the account has one. A stolen session should not be enough
  // to erase somebody's account, and typing the password is the cheapest proof
  // that the person pressing the button is the one who owns it.
  //
  // Optional because an account opened through Google has no password to type.
  @IsOptional()
  @IsString()
  password?: string;
}
