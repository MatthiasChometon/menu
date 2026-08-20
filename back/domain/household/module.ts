import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { ProfileModule } from '../profile/module';
import { HouseholdRepository } from './repository';
import { HouseholdResolver } from './resolver';

@Module({
  imports: [AuthModule, ProfileModule],
  providers: [HouseholdResolver, HouseholdRepository],
})
export class HouseholdModule {}
