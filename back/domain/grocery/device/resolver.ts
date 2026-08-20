import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { GroceryDevice, PairedGroceryDevice } from './model';
import { GroceryDeviceRepository } from './repository';
import { DeviceTokenService } from './token.service';

@Resolver(() => GroceryDevice)
export class GroceryDeviceResolver {
  constructor(
    private readonly devices: GroceryDeviceRepository,
    private readonly tokens: DeviceTokenService,
  ) {}

  @Query(() => [GroceryDevice], { description: 'The browsers this account has paired.' })
  @UseGuards(AuthGuard)
  async myGroceryDevices(@CurrentUser() user: User): Promise<GroceryDevice[]> {
    return this.devices.listByUser(user.id);
  }

  @Mutation(() => PairedGroceryDevice, {
    description: 'Pairs a browser with this account and hands it the token it will carry.',
  })
  @UseGuards(AuthGuard)
  async pairGroceryDevice(
    @CurrentUser() user: User,
    @Args('label') label: string,
  ): Promise<PairedGroceryDevice> {
    const token = this.tokens.issue();
    const device = await this.devices.pair(user.id, label, this.tokens.fingerprint(token));

    return { device, token };
  }

  @Mutation(() => Boolean, {
    description: 'Revokes a browser. It stops being able to run orders immediately.',
  })
  @UseGuards(AuthGuard)
  async unpairGroceryDevice(
    @CurrentUser() user: User,
    @Args('deviceId', { type: () => ID }) deviceId: string,
  ): Promise<boolean> {
    return this.devices.unpair(user.id, deviceId);
  }
}
