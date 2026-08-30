import type { Type } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { AppModule } from '../../app.module';
import { DATABASE, type Database } from '../database/token';
import { MAIL_TRANSPORT, type MailMessage } from '../mail/token';
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
    headers?: Record<string, string>,
  ) => Promise<{ statusCode: number; body: string; cookies: TestCookie[] }>;
  /** Sends one file the way a browser does, for the routes that take a photograph. */
  postFile: (
    url: string,
    filename: string,
    bytes: Buffer,
    cookie?: string,
  ) => Promise<{ statusCode: number; body: string }>;
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
  /**
   * Send a GraphQL operation the way the front does. Extra headers cover the
   * callers that carry something other than a session cookie — the paired
   * browser and its device token.
   */
  graphql: <T>(
    query: string,
    variables?: object,
    cookie?: string,
    headers?: Record<string, string>,
  ) => Promise<GraphqlResponse<T>>;
  /**
   * Reach a provider directly, for the few behaviours that have no route of
   * their own — a repository answering against a real database rather than a
   * stand-in that agrees with whatever it is told.
   */
  resolve: <T>(token: Type<T>) => T;
  /**
   * Opens an account the way a person does: register, follow the link out of
   * the mail, come back signed in. Returns the session cookie header.
   *
   * Every test that needs a signed-in reader goes through this, so the day
   * verification changes shape, the suite finds out here rather than in
   * nineteen unrelated places.
   */
  signUp: (email: string, password: string) => Promise<string>;
  /**
   * What the app tried to send. The transport is replaced, not the service, so
   * the message under test is the one the real MailService built.
   */
  mails: () => MailMessage[];
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

  const sent: MailMessage[] = [];

  // Only the transport is swapped. Stubbing MailService instead would skip the
  // one thing worth checking — that the message reaching the wire says what we
  // think it says, link included.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_TRANSPORT)
    .useValue({
      sendMail: (message: MailMessage): Promise<void> => {
        sent.push(message);
        return Promise.resolve();
      },
    })
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(createAdapter());
  // The same wiring main.ts applies, so the suite tests the server that ships
  // rather than a lookalike missing its guards and headers.
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const database = app.get<Database>(DATABASE);

  const post: TestApp['post'] = async (url, body, cookie, headers) => {
    const response = await app.inject({
      method: 'POST',
      url,
      payload: body,
      headers: { ...headers, ...(cookie === undefined ? {} : { cookie }) },
    });

    return {
      statusCode: response.statusCode,
      body: response.body,
      cookies: cookiesOf(response.cookies),
    };
  };

  // Multipart has to be assembled by hand: inject() takes a body and headers,
  // and the routes that receive a photograph will only ever be exercised this
  // way — a JSON stand-in would test a request the server never gets.
  // Multipart has to be assembled by hand: inject() takes a body and headers,
  // and the routes that receive a photograph will only ever be exercised this
  // way — a JSON stand-in would test a request the server never gets.
  //
  // The line endings are CRLF because the format says so. Bare newlines parse
  // as an unterminated part, which reads as a corrupt upload rather than as a
  // malformed test.
  const postFile: TestApp['postFile'] = async (url, filename, bytes, cookie) => {
    const boundary = '----menuE2EBoundary';
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

    const response = await app.inject({
      method: 'POST',
      url,
      payload: Buffer.concat([head, bytes, tail]),
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        ...(cookie === undefined ? {} : { cookie }),
      },
    });

    return { statusCode: response.statusCode, body: response.body };
  };

  const signUp: TestApp['signUp'] = async (email, password) => {
    await post('/auth/register', { email, password });

    // Read out of the message rather than the database: if the link that
    // actually reaches a reader is wrong, no amount of correct state saves it.
    //
    // Found by looking for THIS address rather than by taking the last message
    // sent. The app now writes to the maintainer as well as to readers, so the
    // newest message is not always the verification one — and a helper that
    // assumed it was failed in tests that had nothing to do with signing up.
    const verification = [...sent]
      .reverse()
      .find((message): boolean => message.to === email && /token=[a-f0-9]{64}/.test(message.text));
    const token = /token=([a-f0-9]{64})/.exec(verification?.text ?? '')?.[1];
    if (token === undefined) throw new Error('No verification link was sent.');

    const verified = await post('/auth/verify-email', { token });
    const session = verified.cookies.find((cookie): boolean => cookie.name === 'session');
    if (session === undefined) throw new Error('Verifying the link opened no session.');

    return `session=${session.value}`;
  };

  return {
    post,
    signUp,
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
    graphql: async <T>(
      query: string,
      variables?: object,
      cookie?: string,
      headers?: Record<string, string>,
    ) => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: { query, variables },
        headers: { ...headers, ...(cookie === undefined ? {} : { cookie }) },
      });

      return JSON.parse(response.body) as GraphqlResponse<T>;
    },
    postFile,
    resolve: <T>(token: Type<T>): T => app.get<T>(token),
    mails: (): MailMessage[] => sent,
    // CASCADE rather than a delete order: the profile hangs off the user, and
    // the list has to keep working when a slice adds its own table.
    reset: async (): Promise<void> => {
      // grocery_product hangs off no account, so CASCADE never reaches it: it
      // has to be named.
      await database.execute(
        sql`TRUNCATE TABLE "profile", "user", "grocery_product" RESTART IDENTITY CASCADE`,
      );
      sent.length = 0;
    },
    close: (): Promise<void> => app.close(),
  };
};
