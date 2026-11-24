import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Module,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Args, Field, GraphQLModule, InputType, Int, Query, Resolver } from '@nestjs/graphql';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { IsInt, Min } from 'class-validator';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { GraphQLError } from 'graphql';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatGraphqlError } from './graphql-error';
import { ErrorsInfrastructureModule } from './module';

const SQL_LEAK = 'insert into "secret_table" (token) values ($1)';
const BODY_LIMIT_BYTES = 64;

const sqlViolation = (code: string): Error =>
  new DrizzleQueryError(
    SQL_LEAK,
    [],
    Object.assign(new postgres.PostgresError(SQL_LEAK), { code }),
  );

type Kind =
  | 'unauthenticated'
  | 'forbidden'
  | 'missing'
  | 'slowDown'
  | 'rateLimited'
  | 'brokenByDesign'
  | 'duplicate'
  | 'dangling'
  | 'crash'
  | 'otherSql';

const failures: Record<Kind, () => Error> = {
  unauthenticated: () => new UnauthorizedException('Sign in first.'),
  forbidden: () => new ForbiddenException('Not yours.'),
  missing: () => new NotFoundException('No such thing.'),
  slowDown: () => new HttpException('Slow down.', 429),
  rateLimited: () => new GraphQLError('Slow down.', { extensions: { code: 'TOO_MANY_REQUESTS' } }),
  brokenByDesign: () => new HttpException('Upstream is down.', 503),
  duplicate: () => sqlViolation('23505'),
  dangling: () => sqlViolation('23503'),
  crash: () => new Error(`connect ECONNREFUSED ${SQL_LEAK}`),
  otherSql: () => sqlViolation('42P01'),
};

const fail = (kind: Kind): never => {
  throw failures[kind]();
};

class Payload {
  @IsInt()
  @Min(1)
  count!: number;
}

@InputType()
class CountInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  count!: number;
}

@Controller('boom')
class BoomController {
  @Get(':kind')
  boom(@Param('kind') kind: Kind): never {
    return fail(kind);
  }

  @Post()
  echo(@Body() payload: Payload): Payload {
    return payload;
  }
}

@Resolver()
class BoomResolver {
  @Query(() => String)
  boom(@Args('kind', { type: () => String }) kind: Kind): string {
    return fail(kind);
  }

  @Query(() => Int)
  counted(@Args('input') input: CountInput): number {
    return input.count;
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

type GraphqlError = { message: string; extensions: { code: string } };

let app: NestFastifyApplication;

const rest = async (kind: Kind): Promise<{ status: number; body: string }> => {
  const response = await app.inject({ method: 'GET', url: `/boom/${kind}` });
  return { status: response.statusCode, body: response.body };
};

const post = async (body: string): Promise<{ status: number; body: string }> => {
  const response = await app.inject({
    method: 'POST',
    url: '/boom',
    headers: { 'content-type': 'application/json' },
    payload: body,
  });
  return { status: response.statusCode, body: response.body };
};

const graphql = async (query: string): Promise<GraphqlError> => {
  const response = await app.inject({ method: 'POST', url: '/graphql', payload: { query } });
  return (JSON.parse(response.body) as { errors: GraphqlError[] }).errors[0];
};

const graphqlBoom = (kind: Kind): Promise<GraphqlError> =>
  graphql(`query { boom(kind: "${kind}") }`);

beforeAll(async (): Promise<void> => {
  const moduleRef = await Test.createTestingModule({ imports: [BoomModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ bodyLimit: BODY_LIMIT_BYTES }),
  );
  app.useGlobalPipes(new ValidationPipe());
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
    ['slowDown', 429],
    ['brokenByDesign', 503],
    ['duplicate', 409],
    ['dangling', 409],
  ] as const)('turns %s into a %i', async (kind, status) => {
    const response = await rest(kind);

    expect(response.status).toBe(status);
  });

  it('keeps the message an expected failure chose to give', async () => {
    const response = await rest('missing');

    expect(JSON.parse(response.body)).toMatchObject({ message: 'No such thing.' });
  });

  it.each(['crash', 'otherSql'] as const)(
    'hides everything about an unexpected %s',
    async (kind) => {
      const response = await rest(kind);

      expect(response.status).toBe(500);
      expect(response.body).not.toContain('secret_table');
      expect(response.body).not.toContain('ECONNREFUSED');
    },
  );

  it('answers a body over the limit with a 413, not a crash', async () => {
    const response = await post(
      JSON.stringify({ count: 1, padding: 'x'.repeat(BODY_LIMIT_BYTES) }),
    );

    expect(response.status).toBe(413);
  });

  it('answers a broken JSON body with a 400, not a crash', async () => {
    const response = await post('{"count": ');

    expect(response.status).toBe(400);
  });

  it('answers a body the validation pipe refuses with a 400', async () => {
    const response = await post(JSON.stringify({ count: 0 }));

    expect(response.status).toBe(400);
  });
});

describe('an error answered over GraphQL', () => {
  it.each([
    ['unauthenticated', 'UNAUTHENTICATED'],
    ['forbidden', 'FORBIDDEN'],
    ['missing', 'NOT_FOUND'],
    ['slowDown', 'TOO_MANY_REQUESTS'],
    ['rateLimited', 'TOO_MANY_REQUESTS'],
    ['duplicate', 'CONFLICT'],
    ['dangling', 'CONFLICT'],
    ['crash', 'INTERNAL_SERVER_ERROR'],
    ['otherSql', 'INTERNAL_SERVER_ERROR'],
  ] as const)('gives %s the code %s', async (kind, code) => {
    const error = await graphqlBoom(kind);

    expect(error.extensions.code).toBe(code);
  });

  it('gives an argument the validation pipe refuses BAD_USER_INPUT', async () => {
    const error = await graphql('query { counted(input: { count: 0 }) }');

    expect(error.extensions.code).toBe('BAD_USER_INPUT');
  });

  it('hides everything about an unexpected failure', async () => {
    const error = await graphqlBoom('crash');

    expect(JSON.stringify(error)).not.toMatch(/secret_table|ECONNREFUSED|stacktrace/);
  });

  it('keeps the message an expected failure chose to give', async () => {
    const error = await graphqlBoom('missing');

    expect(error.message).toBe('No such thing.');
  });
});

describe('the GraphQL error formatter on its own', () => {
  it('replaces the message of an error that escaped the filter and carries no code', () => {
    const formatted = formatGraphqlError(
      { message: `connect ECONNREFUSED ${SQL_LEAK}` },
      new Error(`connect ECONNREFUSED ${SQL_LEAK}`),
    );

    expect(JSON.stringify(formatted)).not.toContain('secret_table');
    expect(formatted.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('leaves an error that already has its own code alone', () => {
    const own = { message: 'Syntax error.', extensions: { code: 'GRAPHQL_PARSE_FAILED' } };

    expect(formatGraphqlError(own, new Error('Syntax error.'))).toEqual(own);
  });
});
