import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContext } from '../../../infrastructure/http/request-context';
import { GroceryDeviceRepository } from './repository';
import { DeviceTokenService } from './token.service';
import { deviceAuth } from './utils';

// The extension has no session cookie: it carries the pairing token it was
// given once, in a header. Everything it may do is scoped to the account that
// paired it.
@Injectable()
export class GroceryDeviceGuard implements CanActivate {
  constructor(
    private readonly devices: GroceryDeviceRepository,
    private readonly tokens: DeviceTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = RequestContext.from(context);
    if (request === undefined) {
      throw new UnauthorizedException();
    }

    const token = request.headers[deviceAuth().headerName];
    if (typeof token !== 'string') {
      throw new UnauthorizedException();
    }

    const device = await this.devices.findByTokenHash(this.tokens.fingerprint(token));
    if (device === undefined) {
      throw new UnauthorizedException();
    }

    request.currentDevice = device;
    await this.devices.markSeen(device.id);
    return true;
  }
}
