import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common';
import { lastValueFrom, NEVER, of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, RequestTimeoutInterceptor } from './request-timeout.interceptor';

const contextOf = (options: { skip?: boolean; operation?: string } = {}): ExecutionContext =>
  ({
    getType: (): string => (options.operation === undefined ? 'http' : 'graphql'),
    getHandler: () => (): void => undefined,
    getClass: () => class Controller {},
    getArgs: () => [{}, {}, {}, { operation: { operation: options.operation } }],
    skip: options.skip,
  }) as unknown as ExecutionContext;

const reflectorFor = (context: ExecutionContext): Reflector =>
  ({
    getAllAndOverride: (): boolean | undefined => (context as unknown as { skip?: boolean }).skip,
  }) as unknown as Reflector;

const outcomeOf = (
  handler: CallHandler,
  context: ExecutionContext = contextOf(),
): Promise<unknown> =>
  lastValueFrom(
    new RequestTimeoutInterceptor(reflectorFor(context)).intercept(context, handler),
  ).catch((error: unknown): unknown => error);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the request timeout', () => {
  it('lets a request that answers in time through untouched', async () => {
    const outcome = outcomeOf({
      handle: () => timer(REQUEST_TIMEOUT_MS - 1).pipe(map(() => 'done')),
    });

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);

    await expect(outcome).resolves.toBe('done');
  });

  it('answers 408 to a request that never finishes', async () => {
    const outcome = outcomeOf({ handle: () => NEVER });

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    await expect(outcome).resolves.toBeInstanceOf(RequestTimeoutException);
  });

  it('lets the handler error through as it was thrown', async () => {
    const failure = new Error('boom');

    await expect(outcomeOf({ handle: () => throwError(() => failure) })).resolves.toBe(failure);
  });

  it('passes a synchronous answer', async () => {
    await expect(outcomeOf({ handle: () => of('now') })).resolves.toBe('now');
  });

  it('does not cut a route that opted out, however long it takes', async () => {
    const outcome = outcomeOf(
      { handle: () => timer(REQUEST_TIMEOUT_MS * 2).pipe(map(() => 'converted')) },
      contextOf({ skip: true }),
    );

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);

    await expect(outcome).resolves.toBe('converted');
  });

  it('does not cut a subscription', async () => {
    const outcome = outcomeOf(
      { handle: () => timer(REQUEST_TIMEOUT_MS * 2).pipe(map(() => 'event')) },
      contextOf({ operation: 'subscription' }),
    );

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);

    await expect(outcome).resolves.toBe('event');
  });

  it('still cuts a GraphQL query', async () => {
    const outcome = outcomeOf({ handle: () => NEVER }, contextOf({ operation: 'query' }));

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    await expect(outcome).resolves.toBeInstanceOf(RequestTimeoutException);
  });
});
