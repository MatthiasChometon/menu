import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../../../infrastructure/http/request-context';
import { AuthenticatedDevice } from './type';

declare module 'fastify' {
  interface FastifyRequest {
    currentDevice?: AuthenticatedDevice;
  }
}

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice | undefined =>
    RequestContext.from(context)?.currentDevice,
);
