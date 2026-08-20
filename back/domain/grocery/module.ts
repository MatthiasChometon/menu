import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { GroceryBasketRepository } from './basket/repository';
import { BasketTargetService } from './basket/target.service';
import { GroceryCatalogRepository } from './catalog/repository';
import { GroceryDeviceGuard } from './device/guard';
import { GroceryDeviceRepository } from './device/repository';
import { GroceryDeviceResolver } from './device/resolver';
import { DeviceTokenService } from './device/token.service';
import { GroceryJobRepository } from './job/repository';
import { GroceryJobResolver } from './job/resolver';
import { GroceryPantryRepository } from './pantry/repository';
import { GroceryService } from './service';

@Module({
  imports: [AuthModule],
  providers: [
    GroceryDeviceResolver,
    GroceryDeviceRepository,
    DeviceTokenService,
    GroceryDeviceGuard,
    GroceryJobResolver,
    GroceryJobRepository,
    GroceryService,
    GroceryBasketRepository,
    GroceryCatalogRepository,
    GroceryPantryRepository,
    BasketTargetService,
  ],
})
export class GroceryModule {}
