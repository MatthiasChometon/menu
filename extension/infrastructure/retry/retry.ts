import {
  backoffDelay,
  isTransientStatus,
  retryAfterMs,
} from '../../../front/infrastructure/api/utils/backoff';

export type RetryOptions = {
  /** Attempts in total, the first one included. 1 means "never retry". */
  maxAttempts: number;
  /** Ceiling of the first retry's wait; doubles with each attempt. */
  baseDelayMs: number;
  /** No wait ever exceeds it, and a server asking for longer is not waited for. */
  maxDelayMs: number;
  /** Each attempt is abandoned after this long. */
  timeoutMs: number;
  /** Injected so a test can pin the jitter. */
  random: () => number;
  /** Injected so a test does not wait. */
  sleep: (ms: number) => Promise<void>;
  /** Injected so a test needs no network. */
  fetch: (input: string, init: RequestInit) => Promise<Response>;
};

const DEFAULTS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  timeoutMs: 15_000,
  random: Math.random,
  sleep: (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    }),
  fetch: (input: string, init: RequestInit): Promise<Response> => fetch(input, init),
};

// A request that never got an answer: the network is down or the attempt timed
// out. A caller's own abort is not one.
const isTransientError = (error: unknown): boolean =>
  error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError');

// `fetch` with a deadline per attempt, trying again on a transient failure
// (network, timeout, 408, 429, 502, 503, 504). Only for a call that has no
// effect the second time: a read, or a write that sets a value. Whatever
// answered last is handed back as it came — a refusal is the caller's to read,
// and an answer that stays transient after the last attempt is not turned into
// an exception.
export const fetchWithRetry = async (
  input: string,
  init: RequestInit = {},
  overrides: Partial<RetryOptions> = {},
): Promise<Response> => {
  const options = { ...DEFAULTS, ...overrides };

  for (let attempt = 0; ; attempt += 1) {
    const isLastAttempt = attempt + 1 >= options.maxAttempts;

    try {
      const deadline = AbortSignal.timeout(options.timeoutMs);
      const response = await options.fetch(input, {
        ...init,
        // The caller's own signal still cancels the call.
        signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline,
      });
      if (!isTransientStatus(response.status) || isLastAttempt) return response;

      const asked = retryAfterMs(response.headers.get('retry-after'));
      if (asked !== undefined && asked > options.maxDelayMs) return response;

      await options.sleep(Math.max(asked ?? 0, backoffDelay(attempt, options)));
    } catch (error: unknown) {
      if (!isTransientError(error) || isLastAttempt) throw error;

      await options.sleep(backoffDelay(attempt, options));
    }
  }
};
