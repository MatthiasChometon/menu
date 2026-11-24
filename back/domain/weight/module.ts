import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { WeightRepository } from './repository';
import { WeightResolver } from './resolver';

@Module({
  imports: [AuthModule],
  providers: [WeightResolver, WeightRepository],
})
export class WeightModule {}
