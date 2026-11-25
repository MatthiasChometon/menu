import { captureException } from '@sentry/vue';
import { toRaw } from 'vue';

// What was already sent, by identity. The GraphQL client throws the very object
// its error handler saw. ofetch throws a new FetchError around the failure, but
// it carries the response (or the cause) the interceptor saw: that is the key.
// So a failure reported by an interceptor and again by the code that caught it
// is one event, not two.
const reported = new WeakSet<object>();

const asObject = (value: unknown): object | undefined =>
  typeof value === 'object' && value !== null ? toRaw(value) : undefined;

const keyOf = (error: unknown): object | undefined => {
  const raw = asObject(error);
  if (raw === undefined) return undefined;

  const { response, cause } = raw as { response?: unknown; cause?: unknown };
  return asObject(response) ?? asObject(cause) ?? raw;
};

// Where a caught error goes instead of the console: handled on screen for the
// reader, but still sent to the one place that can tell us it is happening.
// With no DSN configured Sentry was never initialised and captureException does
// nothing, which is the right behaviour for a local checkout. `source` is the
// object an interceptor saw when the error it reports is one it made up.
export const useErrorReporting = (): {
  reportError: (context: string, error: unknown, source?: object) => void;
} => ({
  reportError: (context: string, error: unknown, source?: object): void => {
    const key = source === undefined ? keyOf(error) : asObject(source);
    if (key !== undefined) {
      if (reported.has(key)) return;
      reported.add(key);
    }

    captureException(error, { tags: { context } });
  },
});
