import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { PushSubscriptionInput } from './input';
import { GroceryPushRepository } from './repository';

@Resolver()
export class GroceryPushResolver {
  constructor(
    private readonly subscriptions: GroceryPushRepository,
    private readonly config: ConfigService,
  ) {}

  @Query(() => String, {
    nullable: true,
    description:
      'The public key a browser needs to subscribe. Null when no keys are set, and then no push is ever sent.',
  })
  groceryPushKey(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }

  @Mutation(() => Boolean, { description: 'Agrees to be told on this browser.' })
  @UseGuards(AuthGuard)
  async subscribeToGroceryPush(
    @CurrentUser() user: User,
    @Args('input') input: PushSubscriptionInput,
  ): Promise<boolean> {
    await this.subscriptions.subscribe(user.id, {
      endpoint: input.endpoint,
      keys: { p256dh: input.p256dh, auth: input.auth },
    });

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async unsubscribeFromGroceryPush(
    @CurrentUser() user: User,
    @Args('endpoint') endpoint: string,
  ): Promise<boolean> {
    return this.subscriptions.unsubscribe(user.id, endpoint);
  }
}
