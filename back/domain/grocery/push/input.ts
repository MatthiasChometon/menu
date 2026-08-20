import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';
import { pushConstraints } from './utils';

@InputType({ description: 'What a browser hands over when it agrees to be told.' })
export class PushSubscriptionInput {
  @Field()
  @IsString()
  @MaxLength(pushConstraints().endpointMaxLength)
  endpoint!: string;

  @Field()
  @IsString()
  @MaxLength(pushConstraints().keyMaxLength)
  p256dh!: string;

  @Field()
  @IsString()
  @MaxLength(pushConstraints().keyMaxLength)
  auth!: string;
}
