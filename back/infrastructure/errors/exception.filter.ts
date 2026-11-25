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
import { GqlArgumentsHost } from '@nestjs/graphql';
import { captureException } from '@sentry/nestjs';
import { GraphQLError } from 'graphql';
import postgres from 'postgres';
import { codeOfStatus } from './graphql-error';

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

// Fastify's own errors (body over the limit, broken JSON, unsupported media type,
// upload over the cap) are not HttpExceptions but carry the status to answer
// with. They are the caller's mistake, not a crash: answered as such, unreported.
const clientErrorFrom = (exception: unknown): HttpException | undefined => {
  if (!(exception instanceof Error) || !('statusCode' in exception)) return undefined;
  const { statusCode } = exception;
  if (typeof statusCode !== 'number' || statusCode < 400 || statusCode >= 500) return undefined;

  return new HttpException(exception.message, statusCode);
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
  private readonly requestLogger = new Logger('Request');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Already a well-formed GraphQL error with its own code (the rate limiter's).
    if (exception instanceof GraphQLError) throw exception;

    const failure = this.expectedFailureOf(exception) ?? this.reportUnexpected(exception);

    // GraphQL answers 200 and puts the failure in the body: rethrowing lets
    // the formatter in the GraphQL module give it its stable code.
    if (host.getType<string>() === 'graphql') {
      this.logRefusal(host, failure);
      throw failure;
    }

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      bodyOf(failure),
      failure.getStatus(),
    );
  }

  // The one request-log line of a refused GraphQL operation (a guard refuses
  // before the request-log interceptor runs): which operation, the status it
  // maps to and its code. Never the arguments, the query text or a token.
  private logRefusal(host: ArgumentsHost, failure: HttpException): void {
    const info = GqlArgumentsHost.create(host).getInfo<{
      parentType: { name: string };
      fieldName: string;
    }>();
    const status = failure.getStatus();

    this.requestLogger.warn(
      `${info.parentType.name}.${info.fieldName} ${status} ${codeOfStatus(status)}`,
    );
  }

  private expectedFailureOf(exception: unknown): HttpException | undefined {
    return exception instanceof HttpException
      ? exception
      : (clientErrorFrom(exception) ?? conflictFrom(exception));
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
