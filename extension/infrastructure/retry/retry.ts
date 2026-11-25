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

// What a server answers when it is overloaded or asks to come back later, and
// nothing else: a 500 is a bug that will answer the same again, a 4xx a refusal.
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([408, 429, 502, 503, 504]);

export const isTransientStatus = (status: number): boolean => TRANSIENT_STATUSES.has(status);

// A request that never got an answer: the network is down or the attempt timed
// out. A caller's own abort is not one.
const isTransientError = (error: unknown): boolean =>
  error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError');

// `Retry-After` is either a number of seconds or an HTTP date.
export const retryAfterMs = (
  header: string | null,
  now: number = Date.now(),
): number | undefined => {
  if (header === null || header.trim() === '') return undefined;

  if (/^\d+$/.test(header.trim())) return Number(header.trim()) * 1000;

  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

// Full jitter: anywhere between nothing and the exponential ceiling, so callers
// that failed together do not come back together.
export const backoffDelay = (
  attempt: number,
  { baseDelayMs, maxDelayMs, random }: Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'random'>,
): number => Math.floor(random() * Math.min(maxDelayMs, baseDelayMs * 2 ** attempt));

// How long to wait before a polling loop asks again: the interval, give or take
// a fifth, so several browsers started together drift apart instead of asking
// the API in the same second. Full jitter would halve the polling rate.
export const jitteredInterval = (intervalMs: number, random: () => number = Math.random): number =>
  Math.round(intervalMs * (0.8 + random() * 0.4));

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
      const response = await options.fetch(input, {
        ...init,
        signal: AbortSignal.timeout(options.timeoutMs),
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
