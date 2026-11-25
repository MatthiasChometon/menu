import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLogInterceptor } from './request-log.interceptor';
import { RequestTimeoutInterceptor } from './request-timeout.interceptor';

// Registered as providers, in this order, so the e2e suite (which builds the
// module itself) runs the same chain as production. The log comes first and so
// wraps the timeout: a request cut short is logged as the 408 it answered.
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestTimeoutInterceptor },
  ],
})
export class InterceptorsInfrastructureModule {}
