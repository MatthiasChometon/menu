import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { CustomFoodRepository } from './repository';
import { CustomFoodResolver } from './resolver';

@Module({
  imports: [AuthModule],
  providers: [CustomFoodResolver, CustomFoodRepository],
  exports: [CustomFoodRepository],
})
export class CustomFoodModule {}
