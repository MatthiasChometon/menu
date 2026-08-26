import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { ImprovementRequestRepository } from './repository';
import { ImprovementRequestResolver } from './resolver';
import { ImprovementRequestService } from './service';

@Module({
  imports: [AuthModule],
  providers: [ImprovementRequestResolver, ImprovementRequestService, ImprovementRequestRepository],
})
export class ImprovementRequestModule {}
