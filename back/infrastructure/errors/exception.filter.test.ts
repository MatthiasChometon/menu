import {
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Args, GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatGraphqlError } from './graphql-error';
import { ErrorsInfrastructureModule } from './module';

const SQL_LEAK = 'insert into "secret_table" (token) values ($1)';

const sqlViolation = (code: string): Error =>
  new DrizzleQueryError(
    SQL_LEAK,
    [],
    Reflect.construct(postgres.PostgresError, [{ message: SQL_LEAK, code }]) as Error,
  );

const failures: Record<string, () => Error> = {
  unauthenticated: () => new UnauthorizedException('Sign in first.'),
  forbidden: () => new ForbiddenException('Not yours.'),
  missing: () => new NotFoundException('No such thing.'),
  duplicate: () => sqlViolation('23505'),
  dangling: () => sqlViolation('23503'),
  crash: () => new Error(`connect ECONNREFUSED ${SQL_LEAK}`),
  otherSql: () => sqlViolation('42P01'),
};

const fail = (kind: string): never => {
  const make = failures[kind];
  throw make === undefined ? new Error('unknown kind') : make();
};

@Controller('boom')
class BoomController {
  @Get(':kind')
  boom(@Param('kind') kind: string): never {
    return fail(kind);
  }
}

@Resolver()
class BoomResolver {
  @Query(() => String)
  boom(@Args('kind') kind: string): string {
    return fail(kind);
  }
}

@Module({
  imports: [
    ErrorsInfrastructureModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      autoTransformHttpErrors: false,
      formatError: formatGraphqlError,
      includeStacktraceInErrorResponses: false,
    }),
  ],
  controllers: [BoomController],
  providers: [BoomResolver],
})
class BoomModule {}

type GraphqlBody = { errors: { message: string; extensions: { code: string } }[] };

let app: NestFastifyApplication;

const rest = async (kind: string): Promise<{ status: number; body: string }> => {
  const response = await app.inject({ method: 'GET', url: `/boom/${kind}` });
  return { status: response.statusCode, body: response.body };
};

const graphql = async (kind: string): Promise<GraphqlBody['errors'][number]> => {
  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: `query { boom(kind: "${kind}") }` },
  });
  return (JSON.parse(response.body) as GraphqlBody).errors[0];
};

beforeAll(async (): Promise<void> => {
  const moduleRef = await Test.createTestingModule({ imports: [BoomModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  // The filter logs an unknown error on purpose; keep the test output readable.
  app.useLogger(false);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async (): Promise<void> => {
  await app.close();
});

describe('an error answered over REST', () => {
  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['missing', 404],
    ['duplicate', 409],
    ['dangling', 409],
  ])('turns %s into a %i', async (kind, status) => {
    const response = await rest(kind);

    expect(response.status).toBe(status);
  });

  it('keeps the message an expected failure chose to give', async () => {
    const response = await rest('missing');

    expect(JSON.parse(response.body)).toMatchObject({ message: 'No such thing.' });
  });

  it.each(['crash', 'otherSql'])('hides everything about an unexpected %s', async (kind) => {
    const response = await rest(kind);

    expect(response.status).toBe(500);
    expect(response.body).not.toContain('secret_table');
    expect(response.body).not.toContain('ECONNREFUSED');
  });
});

describe('an error answered over GraphQL', () => {
  it.each([
    ['unauthenticated', 'UNAUTHENTICATED'],
    ['forbidden', 'FORBIDDEN'],
    ['missing', 'NOT_FOUND'],
    ['duplicate', 'CONFLICT'],
    ['dangling', 'CONFLICT'],
    ['crash', 'INTERNAL_SERVER_ERROR'],
    ['otherSql', 'INTERNAL_SERVER_ERROR'],
  ])('gives %s the code %s', async (kind, code) => {
    const error = await graphql(kind);

    expect(error.extensions.code).toBe(code);
  });

  it('hides everything about an unexpected failure', async () => {
    const error = await graphql('crash');

    expect(JSON.stringify(error)).not.toMatch(/secret_table|ECONNREFUSED|stacktrace/);
  });

  it('keeps the message an expected failure chose to give', async () => {
    const error = await graphql('missing');

    expect(error.message).toBe('No such thing.');
  });
});
