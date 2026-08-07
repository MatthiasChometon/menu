import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { AppModule } from '../../app.module';
import { DATABASE, type Database } from '../database/token';

const MIGRATIONS_FOLDER = './infrastructure/database/migrations';

export type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export type TestApp = {
  /** POST to a REST route, optionally carrying a session. */
  post: (
    url: string,
    body?: object,
    cookie?: string,
  ) => Promise<{ statusCode: number; body: string; cookies: TestCookie[] }>;
  /** GET a REST route, optionally carrying cookies. */
  get: (
    url: string,
    cookie?: string,
  ) => Promise<{ statusCode: number; headers: Record<string, unknown>; cookies: TestCookie[] }>;
  /** Send a GraphQL operation the way the front does. */
  graphql: <T>(query: string, variables?: object, cookie?: string) => Promise<GraphqlResponse<T>>;
  /** Empty every table, so each test starts from a known state. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

export type TestCookie = { name: string; value: string; httpOnly?: boolean; maxAge?: number };

const cookiesOf = (raw: unknown): TestCookie[] =>
  Array.isArray(raw) ? (raw as TestCookie[]) : raw === undefined ? [] : [raw as TestCookie];

// Boots the real application, wired exactly as main.ts wires it: a contract test
// that skipped the validation pipe or the cookie plugin would be testing a
// different server from the one that ships.
export const startTestApp = async (): Promise<TestApp> => {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL must point at the test database.');

  const migrationClient = postgres(url, { max: 1 });
  await migrate(drizzle({ client: migrationClient }), { migrationsFolder: MIGRATIONS_FOLDER });
  await migrationClient.end();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.register(fastifyCookie);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const database = app.get<Database>(DATABASE);

  return {
    post: async (url, body, cookie) => {
      const response = await app.inject({
        method: 'POST',
        url,
        payload: body,
        headers: cookie === undefined ? {} : { cookie },
      });

      return {
        statusCode: response.statusCode,
        body: response.body,
        cookies: cookiesOf(response.cookies),
      };
    },
    get: async (url, cookie) => {
      const response = await app.inject({
        method: 'GET',
        url,
        headers: cookie === undefined ? {} : { cookie },
      });

      return {
        statusCode: response.statusCode,
        headers: response.headers,
        cookies: cookiesOf(response.cookies),
      };
    },
    graphql: async <T>(query: string, variables?: object, cookie?: string) => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: { query, variables },
        headers: cookie === undefined ? {} : { cookie },
      });

      return JSON.parse(response.body) as GraphqlResponse<T>;
    },
    // CASCADE rather than a delete order: the profile hangs off the user, and
    // the list has to keep working when a slice adds its own table.
    reset: async (): Promise<void> => {
      await database.execute(sql`TRUNCATE TABLE "profile", "user" RESTART IDENTITY CASCADE`);
    },
    close: (): Promise<void> => app.close(),
  };
};
