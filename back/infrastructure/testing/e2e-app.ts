import type { Type } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { AppModule } from '../../app.module';
import { DATABASE, type Database } from '../database/token';
import { configureApp, createAdapter } from '../http/setup';

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
  /** GET a route, optionally carrying cookies and extra headers. */
  get: (
    url: string,
    cookie?: string,
    headers?: Record<string, string>,
  ) => Promise<{
    statusCode: number;
    headers: Record<string, unknown>;
    body: string;
    cookies: TestCookie[];
  }>;
  /** Send a GraphQL operation the way the front does. */
  graphql: <T>(query: string, variables?: object, cookie?: string) => Promise<GraphqlResponse<T>>;
  /**
   * Reach a provider directly, for the few behaviours that have no route of
   * their own — a repository answering against a real database rather than a
   * stand-in that agrees with whatever it is told.
   */
  resolve: <T>(token: Type<T>) => T;
  /** Empty every table, so each test starts from a known state. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

export type TestCookie = { name: string; value: string; httpOnly?: boolean; maxAge?: number };

const cookiesOf = (raw: unknown): TestCookie[] =>
  Array.isArray(raw) ? (raw as TestCookie[]) : raw === undefined ? [] : [raw as TestCookie];

// Boots the real application through the very setup main.ts uses, so a guard,
// a header or a body limit added there is exercised here without anyone having
// to remember to mirror it.
export const startTestApp = async (): Promise<TestApp> => {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL must point at the test database.');

  const migrationClient = postgres(url, { max: 1 });
  await migrate(drizzle({ client: migrationClient }), { migrationsFolder: MIGRATIONS_FOLDER });
  await migrationClient.end();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(createAdapter());
  // The same wiring main.ts applies, so the suite tests the server that ships
  // rather than a lookalike missing its guards and headers.
  await configureApp(app);
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
    get: async (url, cookie, headers) => {
      const response = await app.inject({
        method: 'GET',
        url,
        headers: { ...headers, ...(cookie === undefined ? {} : { cookie }) },
      });

      return {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
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
    resolve: <T>(token: Type<T>): T => app.get<T>(token),
    // CASCADE rather than a delete order: the profile hangs off the user, and
    // the list has to keep working when a slice adds its own table.
    reset: async (): Promise<void> => {
      await database.execute(sql`TRUNCATE TABLE "profile", "user" RESTART IDENTITY CASCADE`);
    },
    close: (): Promise<void> => app.close(),
  };
};
