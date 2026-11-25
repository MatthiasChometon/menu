import { captureException } from '@sentry/vue';
import { toRaw } from 'vue';

// What was already sent. The GraphQL client throws the very object its error
// handler saw, so a failure reported by the interceptor and again by the
// composable that caught it is one event, not two.
const reported = new WeakSet<object>();

// Where a caught error goes instead of the console: handled on screen for the
// reader, but still sent to the one place that can tell us it is happening.
// With no DSN configured Sentry was never initialised and captureException does
// nothing, which is the right behaviour for a local checkout.
export const useErrorReporting = (): {
  reportError: (context: string, error: unknown) => void;
} => ({
  reportError: (context: string, error: unknown): void => {
    if (typeof error === 'object' && error !== null) {
      const raw = toRaw(error);
      if (reported.has(raw)) return;
      reported.add(raw);
    }

    captureException(error, { tags: { context } });
  },
});
