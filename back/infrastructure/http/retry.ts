// Not shared with the front/extension backoff helper on purpose: the back is its own deployable with no shared package, and the copy is ~20 lines.
export type RetryOptions = {
  /** Attempts in total, the first one included. */
  maxAttempts: number;
  /** Ceiling of the first retry's wait; doubles with each attempt. */
  baseDelayMs: number;
  /** No wait ever exceeds it, and a server asking for longer is not waited for. */
  maxDelayMs: number;
  /** Injected so a test can pin the jitter. */
  random: () => number;
  /** Injected so a test does not wait. */
  sleep: (ms: number) => Promise<void>;
};

/** What a caller says about a failure it wants retried. */
export type Transient = { retryAfterMs?: number | undefined };

const DEFAULTS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  random: Math.random,
  sleep: (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    }),
};

// What a server answers when it is overloaded or asks to come back later, and
// nothing else: a 500 is a bug that will answer the same again, a 4xx a refusal.
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([408, 429, 502, 503, 504]);

export const isTransientStatus = (status: number): boolean => TRANSIENT_STATUSES.has(status);

// `Retry-After` is either a number of seconds or an HTTP date.
export const retryAfterMs = (header: unknown, now: number = Date.now()): number | undefined => {
  if (typeof header !== 'string' || header.trim() === '') return undefined;

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

// Runs an idempotent operation again while it fails with a transient error.
// `classify` answers whether a failure is worth another try; anything else, and
// the last attempt's failure, is thrown as it came. Never wrap a call that has an
// effect the second time (a single-use code, a mail): the caller decides.
export const retryTransient = async <T>(
  operation: () => Promise<T>,
  classify: (error: unknown) => Transient | undefined,
  overrides: Partial<RetryOptions> = {},
): Promise<T> => {
  const options = { ...DEFAULTS, ...overrides };

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      const transient = classify(error);
      const isLastAttempt = attempt + 1 >= options.maxAttempts;
      const asksTooLong = (transient?.retryAfterMs ?? 0) > options.maxDelayMs;
      if (transient === undefined || isLastAttempt || asksTooLong) throw error;

      await options.sleep(Math.max(transient.retryAfterMs ?? 0, backoffDelay(attempt, options)));
    }
  }
};
