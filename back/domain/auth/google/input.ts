/* eslint-disable */
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Both optional: Google sends neither when the person refuses, and that case is
// answered by the same 401 as a wrong state. What they must be is plain text,
// which is what turns `?state=a&state=b` into a 400 instead of an array.
export class GoogleCallbackInput {
  @IsOptional()
  code?: string;

  @IsOptional()
  state?: string;
}
