import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { WeightRepository } from './repository';
import { WeightResolver } from './resolver';
import { WeightService } from './service';

@Module({
  imports: [AuthModule],
  providers: [WeightResolver, WeightService, WeightRepository],
})
export class WeightModule {}
