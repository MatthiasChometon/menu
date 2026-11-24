// First, and before anything from Nest: Sentry instruments modules as they
// load, so an import placed after the framework sees a wired app and catches
// almost nothing. Its position is the point, not a tidiness preference.
import './infrastructure/monitoring/instrument';
import { createServer } from 'node:http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { listenPort, validateEnvironment } from './infrastructure/config/env';
import { underPassenger } from './infrastructure/config/runtime';
import { configureApp, createAdapter } from './infrastructure/http/setup';

// Phusion Passenger, which is what the shared host runs, opens the listening
// socket itself and hands the process a ready one: the port given to listen()
// is ignored, and what Passenger actually waits for is a listen() call on an
// http.Server it instrumented at load time. Fastify creates and listens on its
// own server, which Passenger never sees, so it concludes the app never came up
// and kills it after ninety seconds.
//
// Fastify has the escape hatch for exactly this: routing() feeds an existing
// server's requests through the router. So the server Passenger is watching is
// the one we hand it, and Fastify keeps every route, plugin and hook.
const bootstrap = async (): Promise<void> => {
  // Not through ConfigModule's validate hook: that one validates a copy taken when
  // the module loads, and ConfigService then reads that copy instead of the live
  // process.env. The .env file is already in process.env: the instrument import,
  // first line of this file, loads it.
  validateEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createAdapter(), {
    // Nest aborts the process (SIGABRT) on a boot error unless told not to; the
    // catch below is the single path that logs it and exits 1.
    abortOnError: false,
  });
  await configureApp(app);
  // Lets SIGTERM (a deploy, a restart) close the database pool and finish the
  // requests in flight instead of cutting them. Here only, never in configureApp:
  // the e2e suite closes its own app.
  app.enableShutdownHooks();

  if (!underPassenger()) {
    await app.listen(listenPort(process.env), '0.0.0.0');
    return;
  }

  // listen() is never reached through Nest here, so the wiring it would have
  // triggered has to be asked for by hand: init() builds the modules, ready()
  // settles the Fastify plugin tree registered by configureApp.
  await app.init();
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.ready();

  createServer((request, response): void => {
    fastify.routing(request, response);
  }).listen('passenger');
};

bootstrap().catch((error: unknown): void => {
  new Logger('Bootstrap').error(
    'The server failed to start.',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
