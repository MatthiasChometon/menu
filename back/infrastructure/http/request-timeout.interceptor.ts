import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';

// Neither Fastify nor Node bounds how long a handler may run: `requestTimeout`
// only covers receiving the request, and the connection timeout is off. A stuck
// query or a slow photograph conversion would hold the request until the proxy
// gave up. Generous for the slowest honest route (an 8 MB photograph), short
// enough to free the request before the host's own deadline.
export const REQUEST_TIMEOUT_MS = 30_000;

// The handler's work is not cancelled (a promise cannot be): the caller is
// answered and stops waiting, which is what bounds a request.
@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown): Observable<never> =>
        throwError((): unknown =>
          error instanceof TimeoutError ? new RequestTimeoutException() : error,
        ),
      ),
    );
  }
}
