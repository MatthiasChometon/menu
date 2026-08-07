import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FastifyRequest } from 'fastify';

export class RequestContext {
  // The same guards protect REST controllers and GraphQL resolvers, and the two
  // hold the request in different places. Anything reaching for the request from
  // a guard has to come through here: switchToHttp() returns undefined under
  // GraphQL, and the failure it causes surfaces far from its cause.
  static from(context: ExecutionContext): FastifyRequest | undefined {
    if (context.getType<'graphql'>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req?: FastifyRequest }>().req;
    }

    return context.switchToHttp().getRequest<FastifyRequest>();
  }
}
