import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { CustomFoodRepository } from './repository';
import { CustomFoodResolver } from './resolver';
import { CustomFoodService } from './service';

@Module({
  imports: [AuthModule],
  providers: [CustomFoodResolver, CustomFoodService, CustomFoodRepository],
  exports: [CustomFoodRepository],
})
export class CustomFoodModule {}
