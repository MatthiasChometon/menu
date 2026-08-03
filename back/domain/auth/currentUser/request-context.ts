import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FastifyRequest } from 'fastify';

export class RequestContext {
  // The same guard protects REST controllers and GraphQL resolvers, and the two
  // hold the request in different places.
  static from(context: ExecutionContext): FastifyRequest {
    if (context.getType<'graphql'>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: FastifyRequest }>().req;
    }

    return context.switchToHttp().getRequest<FastifyRequest>();
  }
}
