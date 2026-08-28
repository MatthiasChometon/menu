import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { CurrentDevice } from './current-device';
import { GroceryDeviceGuard } from './guard';
import { GroceryDevice, PairedGroceryDevice } from './model';
import { GroceryDeviceRepository } from './repository';
import { DeviceTokenService } from './token.service';
import { AuthenticatedDevice } from './type';

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

  @Mutation(() => Boolean, {
    description:
      'The extension reports whether the browser it runs in is signed in to Carrefour, so the order page can show it. Authenticated by the pairing token, not a session.',
  })
  @UseGuards(GroceryDeviceGuard)
  async reportCarrefourSession(
    @CurrentDevice() device: AuthenticatedDevice | undefined,
    @Args('signedIn') signedIn: boolean,
  ): Promise<boolean> {
    if (device === undefined) return false;

    await this.devices.reportCarrefourSession(device.id, signedIn);
    return true;
  }
}
