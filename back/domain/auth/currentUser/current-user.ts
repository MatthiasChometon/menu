import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../user/model';
import { RequestContext } from '../../../infrastructure/http/request-context';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
  }
}

export const CurrentUser = createParamDecorator(
  // No request means nobody to be: the resolvers that take this already treat
  // an absent user as anonymous.
  (_data: unknown, context: ExecutionContext): User | undefined =>
    RequestContext.from(context)?.currentUser,
);
