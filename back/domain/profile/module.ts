import { Module } from '@nestjs/common';
import { ProfileResolver } from './resolver';
import { NutritionTargetsService } from './targets.service';

@Module({
  providers: [ProfileResolver, NutritionTargetsService],
  exports: [NutritionTargetsService],
})
export class ProfileModule {}
