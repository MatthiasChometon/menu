import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../user/model';
import { RequestContext } from './request-context';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | undefined =>
    RequestContext.from(context).currentUser,
);
