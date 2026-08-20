import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { GroceryDeviceGuard } from './device/guard';
import { GroceryDeviceRepository } from './device/repository';
import { GroceryDeviceResolver } from './device/resolver';
import { DeviceTokenService } from './device/token.service';
import { GroceryJobRepository } from './job/repository';
import { GroceryJobResolver } from './job/resolver';

@Module({
  imports: [AuthModule],
  providers: [
    GroceryDeviceResolver,
    GroceryDeviceRepository,
    DeviceTokenService,
    GroceryDeviceGuard,
    GroceryJobResolver,
    GroceryJobRepository,
  ],
})
export class GroceryModule {}
