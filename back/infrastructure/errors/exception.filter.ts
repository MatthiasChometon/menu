import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { captureException } from '@sentry/nestjs';
import { GraphQLError } from 'graphql';
import postgres from 'postgres';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const MAX_CAUSE_DEPTH = 5;

// The driver error sits under the ORM's own wrapper, as `cause`.
const sqlStateOf = (error: unknown): string | undefined => {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    if (current instanceof postgres.PostgresError) return current.code;
    current = current.cause;
  }
  return undefined;
};

const conflictFrom = (exception: unknown): ConflictException | undefined => {
  const state = sqlStateOf(exception);
  if (state !== UNIQUE_VIOLATION && state !== FOREIGN_KEY_VIOLATION) return undefined;

  return new ConflictException('The request conflicts with existing data.');
};

const bodyOf = (failure: HttpException): object => {
  const response = failure.getResponse();
  return typeof response === 'string'
    ? { statusCode: failure.getStatus(), message: response }
    : response;
};

// The one place an error becomes an answer, for REST and GraphQL alike. What a
// caller may read is decided here: an expected failure (HttpException) goes out
// as thrown, a constraint violation becomes a 409, and anything else is logged
// with its stack and answered with a generic 500 — the message of an unknown
// error can carry SQL, a path or a secret.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Already a well-formed GraphQL error with its own code (the rate limiter's).
    if (exception instanceof GraphQLError) throw exception;

    const failure = this.expectedFailureOf(exception) ?? this.reportUnexpected(exception);

    // GraphQL answers 200 and puts the failure in the body: rethrowing lets
    // the formatter in the GraphQL module give it its stable code.
    if (host.getType<string>() === 'graphql') throw failure;

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      bodyOf(failure),
      failure.getStatus(),
    );
  }

  private expectedFailureOf(exception: unknown): HttpException | undefined {
    return exception instanceof HttpException ? exception : conflictFrom(exception);
  }

  private reportUnexpected(exception: unknown): HttpException {
    this.logger.error(
      exception instanceof Error ? exception.message : 'A non-Error value was thrown.',
      exception instanceof Error ? exception.stack : undefined,
    );
    captureException(exception, {
      mechanism: { handled: false, type: 'auto.http.nestjs.global_filter' },
    });

    return new InternalServerErrorException();
  }
}
