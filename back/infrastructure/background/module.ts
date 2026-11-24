import { Global, Module } from '@nestjs/common';
import { BackgroundTasks } from './service';

@Global()
@Module({
  providers: [BackgroundTasks],
  exports: [BackgroundTasks],
})
export class BackgroundInfrastructureModule {}
