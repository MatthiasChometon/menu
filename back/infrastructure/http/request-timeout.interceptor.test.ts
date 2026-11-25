import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common';
import { lastValueFrom, NEVER, of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, RequestTimeoutInterceptor } from './request-timeout.interceptor';

const context = {} as ExecutionContext;

const outcomeOf = (handler: CallHandler): Promise<unknown> =>
  lastValueFrom(new RequestTimeoutInterceptor().intercept(context, handler)).catch(
    (error: unknown): unknown => error,
  );

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
});
