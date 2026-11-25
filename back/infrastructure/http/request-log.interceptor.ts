import {
  CallHandler,
  ExecutionContext,
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

// One line per GraphQL operation that succeeded: what was asked and how long it
// took. A refusal or a failure is logged, with its code, by the exception filter
// (a guard refuses before this interceptor even runs), so each transport has one
// place that logs it.
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
      }),
    );
  }

  private line(label: string, status: number, startedAt: number): string {
    return `${label} ${status} ${Math.round(performance.now() - startedAt)}ms`;
  }
}
