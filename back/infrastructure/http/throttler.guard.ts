import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestContext } from './request-context';

type Pair = { req: FastifyRequest; res: FastifyReply };

// The stock guard reaches for the request through switchToHttp(), which under
// GraphQL returns undefined. Every resolver then failed on the tracker's first
// property read — the API answered 200 with an internal error to every query,
// so a signed-in reader looked signed out and no week could be saved. Only
// __typename came through, having no resolver and so no guard.
//
// There is no reply to hand back on that side: the GraphQL context carries the
// request and nothing else, so the rate-limit headers have nowhere to go. They
// are dropped rather than faked, and only for GraphQL — the limiting itself is
// unaffected, since that is decided from the tracker and throws before a
// response is ever written. REST keeps the real reply and its headers.
@Injectable()
export class GqlAwareThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): Pair {
    if (context.getType<'graphql'>() !== 'graphql') {
      return super.getRequestResponse(context) as Pair;
    }

    const request = RequestContext.from(context);
    const sink = { header: (): void => undefined } as unknown as FastifyReply;

    return { req: request as FastifyRequest, res: sink };
  }
}
