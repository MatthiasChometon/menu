import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { MeasurementsMapper } from './measurements.mapper';
import { ProfileRepository } from './repository';
import { ProfileResolver } from './resolver';
import { NutritionTargetsService } from './targets.service';

@Module({
  imports: [AuthModule],
  providers: [ProfileResolver, ProfileRepository, NutritionTargetsService, MeasurementsMapper],
  exports: [NutritionTargetsService, MeasurementsMapper],
})
export class ProfileModule {}
