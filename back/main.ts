import { createServer } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
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
declare const PhusionPassenger: unknown;

const underPassenger = (): boolean => typeof PhusionPassenger !== 'undefined';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createAdapter());
  await configureApp(app);

  if (!underPassenger()) {
    await app.listen(process.env.PORT ?? 3779, '0.0.0.0');
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
void bootstrap();
