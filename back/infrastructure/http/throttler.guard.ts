import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { GraphQLError } from 'graphql';
import { RequestContext } from './request-context';

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
  // GraphQL answers 200 whatever happens and puts the failure in the body, so
  // the 429 the stock guard throws never reaches the caller as a status. What
  // did reach them was INTERNAL_SERVER_ERROR: a client could not tell "slow
  // down and come back" from "the server is broken", and a real fault could not
  // be told from a limit being hit. The code says which one it is.
  protected override throwThrottlingException(context: ExecutionContext): Promise<void> {
    if (context.getType<'graphql'>() !== 'graphql') throw new ThrottlerException();

    throw new GraphQLError('Too many requests. Try again shortly.', {
      extensions: { code: 'TOO_MANY_REQUESTS', http: { status: 429 } },
    });
  }

  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (context.getType<'graphql'>() !== 'graphql') return super.getRequestResponse(context);

    // Only what the limiter reads, copied by name: the request's address and
    // headers are accessors on its prototype, so spreading it would drop them.
    const request = RequestContext.from(context);

    return {
      req: { ip: request?.ip, headers: request?.headers },
      res: { header: (): void => undefined },
    };
  }
}
