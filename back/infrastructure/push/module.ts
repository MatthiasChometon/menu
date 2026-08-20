import { Global, Module } from '@nestjs/common';
import { PushService } from './service';

@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushInfrastructureModule {}
