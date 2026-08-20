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
import { GroceryPreferenceRepository } from './preference/repository';
import { GroceryPreferenceResolver } from './preference/resolver';
import { GrocerySlotRepository } from './slot/repository';
import { GroceryPushRepository } from './push/repository';
import { GroceryPushResolver } from './push/resolver';
import { GroceryReportMail } from './report/mail';
import { GrocerySlotResolver } from './slot/resolver';
import { UserModule } from '../user/module';
import { GroceryService } from './service';

@Module({
  imports: [AuthModule, UserModule],
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
    GroceryPreferenceResolver,
    GroceryPreferenceRepository,
    GrocerySlotResolver,
    GrocerySlotRepository,
    GroceryReportMail,
    GroceryPushResolver,
    GroceryPushRepository,
  ],
})
export class GroceryModule {}
