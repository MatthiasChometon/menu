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
import { Observable, tap } from 'rxjs';

// Only the entry points of a GraphQL operation are logged: a field resolver runs
// under the same interceptor, and one line per nested field would drown the log.
const ROOT_TYPES: ReadonlySet<string> = new Set(['Query', 'Mutation', 'Subscription']);

// The operation name (`Mutation.signIn`); the variables and the body are never
// looked at. REST requests are logged by `logResponses`, which also sees what a
// guard or the throttler refused.
const labelOf = (context: ExecutionContext): string | undefined => {
  if (context.getType<string>() !== 'graphql') return undefined;

  const info = GqlExecutionContext.create(context).getInfo<{
    parentType: { name: string };
    fieldName: string;
  }>();

  return ROOT_TYPES.has(info.parentType.name)
    ? `${info.parentType.name}.${info.fieldName}`
    : undefined;
};

const statusOfFailure = (error: unknown): number =>
  error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

// One line per GraphQL operation: what was asked, how it ended, how long it
// took. GraphQL answers 200 whatever happens, so a failure is logged with the
// status it would have been answered with over REST. A guard that refuses runs
// before this interceptor and leaves no line here. The failure itself (message,
// stack) is the exception filter's business.
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
          this.logger.log(this.line(label, HttpStatus.OK, startedAt));
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
