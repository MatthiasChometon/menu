import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';

// Neither Fastify nor Node bounds how long a handler may run: `requestTimeout`
// only covers receiving the request, and the connection timeout is off. A stuck
// query or a slow photograph conversion would hold the request until the proxy
// gave up. Generous for the slowest honest route (an 8 MB photograph), short
// enough to free the request before the host's own deadline.
export const REQUEST_TIMEOUT_MS = 30_000;

const SKIP_TIMEOUT = 'skipRequestTimeout';

/** For a route whose work is not safe to answer 408 to while it carries on: the
 *  caller would resend and the first attempt would still commit (a photograph
 *  upload). Such a route is bounded by its own limits instead. */
export const SkipTimeout = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_TIMEOUT, true);

// Not cancelled: a promise cannot be, so on a timeout the handler keeps running
// and only the caller is answered and stops waiting. That is why a route that
// writes something the caller might resend opts out with `@SkipTimeout()`.
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.isExempt(context)) return next.handle();

    return next.handle().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown): Observable<never> =>
        throwError((): unknown =>
          error instanceof TimeoutError ? new RequestTimeoutException() : error,
        ),
      ),
    );
  }

  // A subscription is meant to outlive any deadline.
  private isExempt(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean | undefined>(SKIP_TIMEOUT, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    )
      return true;

    return (
      context.getType<string>() === 'graphql' &&
      GqlExecutionContext.create(context).getInfo<{ operation: { operation: string } }>().operation
        .operation === 'subscription'
    );
  }
}
