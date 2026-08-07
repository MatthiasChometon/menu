import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyServerOptions } from 'fastify';

// A JSON API for two people: no request has any business being large, and the
// default megabyte is a free amplification budget for anyone flooding us.
const BODY_LIMIT_BYTES = 128 * 1024;

const DEV_ORIGINS = ['http://localhost:3777', 'http://localhost:3778'];

export const adapterOptions = (): FastifyServerOptions => ({
  bodyLimit: BODY_LIMIT_BYTES,
  // Hosted behind a platform proxy, so the client address arrives in
  // X-Forwarded-For. Without this every caller looks like the proxy and rate
  // limiting would throttle everyone at once.
  trustProxy: true,
});

export const allowedOrigins = (config: ConfigService): string[] => {
  const configured = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin): string => origin.trim())
    .filter((origin): boolean => origin.length > 0);

  if (configured.length > 0) return configured;

  // Nothing configured means a local checkout: the front dev server and the
  // visual-test preview. A deployment must set the variable.
  const front = config.get<string>('FRONT_URL');
  return front === undefined ? DEV_ORIGINS : [...new Set([...DEV_ORIGINS, front])];
};

// Everything main.ts does to the app, in one place, so the e2e suite drives the
// very same server: a contract test against a differently-wired app proves
// nothing about what ships.
export const configureApp = async (app: NestFastifyApplication): Promise<void> => {
  const config = app.get(ConfigService);
  const origins = allowedOrigins(config);

  // An allowlist, not a reflection: `origin: true` echoes whatever origin asks,
  // which combined with credentials lets any site read authenticated answers.
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await app.register(helmet, {
    // This host serves JSON, never a page: the strictest policy is also the
    // correct one, and it costs nothing.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    // Only meaningful over HTTPS, and the platform terminates TLS for us.
    hsts: { maxAge: 15_552_000, includeSubDomains: true },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Drops anything the DTO does not declare, so a crafted body cannot reach
      // a column it was never meant to touch.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.register(fastifyCookie);
};

export const createAdapter = (): FastifyAdapter => new FastifyAdapter(adapterOptions());
