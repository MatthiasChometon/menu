import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '../../../infrastructure/http/request-context';
import { AuthenticatedDevice } from './type';

declare module 'fastify' {
  // An interface on purpose: only interfaces merge into Fastify's own declaration.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyRequest {
    currentDevice?: AuthenticatedDevice;
  }
}

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice | undefined =>
    RequestContext.from(context)?.currentDevice,
);
