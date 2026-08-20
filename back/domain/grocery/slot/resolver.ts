import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { GrocerySlotWindowsInput } from './input';
import { GrocerySlotWindow } from './model';
import { GrocerySlotRepository } from './repository';

@Resolver(() => GrocerySlotWindow)
export class GrocerySlotResolver {
  constructor(private readonly windows: GrocerySlotRepository) {}

  @Query(() => [GrocerySlotWindow], {
    description: 'When a delivery is welcome. Empty means no slot is ever booked.',
  })
  @UseGuards(AuthGuard)
  async myGrocerySlotWindows(@CurrentUser() user: User): Promise<GrocerySlotWindow[]> {
    return this.windows.forUser(user.id);
  }

  @Mutation(() => [GrocerySlotWindow], { description: 'Replaces the windows wholesale.' })
  @UseGuards(AuthGuard)
  async saveGrocerySlotWindows(
    @CurrentUser() user: User,
    @Args('input') input: GrocerySlotWindowsInput,
  ): Promise<GrocerySlotWindow[]> {
    return this.windows.replace(user.id, input.windows);
  }
}
