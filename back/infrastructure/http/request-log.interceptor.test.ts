import { CallHandler, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestLogInterceptor } from './request-log.interceptor';

const graphqlContext = (parentType: string, fieldName: string): ExecutionContext =>
  ({
    getType: (): string => 'graphql',
    getArgs: () => [
      {},
      { password: 'hunter2' },
      {},
      { parentType: { name: parentType }, fieldName },
    ],
    getClass: () => class Resolver {},
    getHandler: () => (): void => undefined,
  }) as unknown as ExecutionContext;

const handling = (result: CallHandler['handle']): CallHandler => ({ handle: result });

const run = async (context: ExecutionContext, handler: CallHandler): Promise<unknown> =>
  lastValueFrom(new RequestLogInterceptor().intercept(context, handler)).catch(
    (error: unknown): unknown => error,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the request log', () => {
  it('logs a GraphQL operation by its name, without its variables', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await run(
      graphqlContext('Mutation', 'signIn'),
      handling(() => of('ok')),
    );

    const line = String(log.mock.calls[0]?.[0]);
    expect(line).toMatch(/^Mutation\.signIn 200 \d+ms$/);
    expect(line).not.toContain('hunter2');
  });

  it('does not log a nested field resolver', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await run(
      graphqlContext('Recipe', 'ingredients'),
      handling(() => of('ok')),
    );

    expect(log).not.toHaveBeenCalled();
  });

  it('logs a refused request with the status it was answered with, and lets the error through', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const refusal = new ForbiddenException();

    const outcome = await run(
      graphqlContext('Query', 'bugReports'),
      handling(() => throwError(() => refusal)),
    );

    expect(outcome).toBe(refusal);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/^Query\.bugReports 403 \d+ms$/);
  });

  it('logs an unexpected failure as a 500', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await run(
      graphqlContext('Query', 'bugReports'),
      handling(() => throwError(() => new Error('connection to db at 10.0.0.1 refused'))),
    );

    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toMatch(/^Query\.bugReports 500 \d+ms$/);
    expect(line).not.toContain('10.0.0.1');
  });

  it('leaves a REST request to the response hook', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const rest = { getType: (): string => 'http' } as unknown as ExecutionContext;

    await run(
      rest,
      handling(() => of('ok')),
    );

    expect(log).not.toHaveBeenCalled();
  });
});
