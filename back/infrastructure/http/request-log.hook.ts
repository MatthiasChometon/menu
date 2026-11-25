import { Logger } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';

// The GraphQL endpoint is logged by operation name by the request-log
// interceptor: one HTTP request can carry several, and it answers 200 anyway.
const GRAPHQL_ROUTE = '/graphql';

// One line per answered REST request, whoever answered it: a guard (401, 403),
// the throttler (429) or a missing route (404) run before any interceptor, and
// those are the lines worth having. The route pattern (`/auth/reset/:token`) is
// logged, never the URL called: a path or a query string can carry a token. No
// header, cookie or body is ever read.
export const logResponses = (server: FastifyInstance, logger = new Logger('Request')): void => {
  server.addHook('onResponse', (request, reply, done): void => {
    const route = request.routeOptions.url;

    if (route !== GRAPHQL_ROUTE) {
      const line = `${request.method} ${route ?? 'unmatched route'} ${reply.statusCode} ${Math.round(reply.elapsedTime)}ms`;
      if (reply.statusCode >= 400) logger.warn(line);
      else logger.log(line);
    }

    done();
  });
};
