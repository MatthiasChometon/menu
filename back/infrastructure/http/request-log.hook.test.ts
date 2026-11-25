import { Logger } from '@nestjs/common';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logResponses } from './request-log.hook';

let server: FastifyInstance;
const lines: string[] = [];

beforeEach(async () => {
  lines.length = 0;
  const logger = new Logger('Request');
  vi.spyOn(logger, 'log').mockImplementation(
    (line: unknown): void => void lines.push(String(line)),
  );
  vi.spyOn(logger, 'warn').mockImplementation(
    (line: unknown): void => void lines.push(String(line)),
  );

  server = fastify();
  logResponses(server, logger);
  server.post('/auth/reset/:token', (_request, reply) => reply.code(201).send({ ok: true }));
  server.get('/me', (_request, reply) => reply.code(401).send({ message: 'Unauthorized' }));
  server.post('/graphql', () => ({ data: null }));
  await server.ready();
});

afterEach(async () => {
  await server.close();
  vi.restoreAllMocks();
});

describe('the request log', () => {
  it('logs a REST request by its route pattern, status and duration', async () => {
    await server.inject({ method: 'POST', url: '/auth/reset/secret-token' });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^POST \/auth\/reset\/:token 201 \d+ms$/);
  });

  it('logs a refusal by a guard, which no interceptor ever sees', async () => {
    await server.inject({ method: 'GET', url: '/me' });

    expect(lines[0]).toMatch(/^GET \/me 401 \d+ms$/);
  });

  it('logs a route that does not exist without echoing what was asked for', async () => {
    await server.inject({ method: 'GET', url: '/wp-admin/secret?probe=1' });

    expect(lines[0]).toMatch(/^GET unmatched route 404 \d+ms$/);
  });

  it('never logs a token, a cookie, a body or a query string', async () => {
    await server.inject({
      method: 'POST',
      url: '/auth/reset/secret-token?email=someone@example.com&access=abc123',
      headers: { cookie: 'session=cookie-secret', authorization: 'Bearer bearer-secret' },
      payload: { password: 'hunter2' },
    });
    await server.inject({
      method: 'GET',
      url: '/me?token=query-secret',
      headers: { cookie: 'session=cookie-secret' },
    });

    const log = lines.join('\n');
    for (const secret of [
      'secret-token',
      'someone@example.com',
      'abc123',
      'cookie-secret',
      'bearer-secret',
      'hunter2',
      'query-secret',
    ]) {
      expect(log).not.toContain(secret);
    }
  });

  it('leaves the GraphQL endpoint to the operation log', async () => {
    await server.inject({ method: 'POST', url: '/graphql' });

    expect(lines).toEqual([]);
  });
});
