import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { ProfileRepository } from './repository';
import { ProfileResolver } from './resolver';
import { NutritionTargetsService } from './targets.service';

@Module({
  imports: [AuthModule],
  providers: [ProfileResolver, ProfileRepository, NutritionTargetsService],
  exports: [NutritionTargetsService],
})
export class ProfileModule {}
