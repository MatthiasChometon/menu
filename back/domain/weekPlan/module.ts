import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { WeekPlanRepository } from './repository';
import { WeekPlanResolver } from './resolver';

@Module({
  imports: [AuthModule],
  providers: [WeekPlanResolver, WeekPlanRepository],
})
export class WeekPlanModule {}
