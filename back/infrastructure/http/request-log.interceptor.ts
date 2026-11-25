import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

// Only the entry points of a GraphQL operation are logged: a field resolver runs
// under the same interceptor, and one line per nested field would drown the log.
const ROOT_TYPES: ReadonlySet<string> = new Set(['Query', 'Mutation', 'Subscription']);

// The route pattern (`/auth/reset/:token`), never the URL actually called: a
// path or a query string can carry a token. For GraphQL, the operation name; the
// variables and the body are never looked at.
const labelOf = (context: ExecutionContext): string | undefined => {
  if (context.getType<string>() === 'graphql') {
    const info = GqlExecutionContext.create(context).getInfo<{
      parentType: { name: string };
      fieldName: string;
    }>();

    return ROOT_TYPES.has(info.parentType.name)
      ? `${info.parentType.name}.${info.fieldName}`
      : undefined;
  }

  const request = context.switchToHttp().getRequest<FastifyRequest>();
  return `${request.method} ${request.routeOptions.url ?? 'unmatched route'}`;
};

// GraphQL answers 200 whatever happens, so the status of an operation is the one
// its failure would have been answered with over REST.
const statusOfSuccess = (context: ExecutionContext): number =>
  context.getType<string>() === 'graphql'
    ? HttpStatus.OK
    : context.switchToHttp().getResponse<FastifyReply>().statusCode;

const statusOfFailure = (error: unknown): number =>
  error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

// One line per request: what was asked, how it ended, how long it took. The
// failure itself (message, stack) is the exception filter's business.
@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const label = labelOf(context);
    if (label === undefined) return next.handle();

    const startedAt = performance.now();

    return next.handle().pipe(
      tap({
        complete: (): void => {
          this.logger.log(this.line(label, statusOfSuccess(context), startedAt));
        },
        error: (error: unknown): void => {
          this.logger.warn(this.line(label, statusOfFailure(error), startedAt));
        },
      }),
    );
  }

  private line(label: string, status: number, startedAt: number): string {
    return `${label} ${status} ${Math.round(performance.now() - startedAt)}ms`;
  }
}
