import { captureException } from '@sentry/vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/vue', () => ({ captureException: vi.fn(), init: vi.fn() }));

describe('reporting a handled error', () => {
  it('sends the error to Sentry, tagged with where it happened', async () => {
    const { reportError } = useErrorReporting();
    const cause = new Error('network down');

    reportError('planner:save', cause);

    await vi.waitFor(() =>
      expect(captureException).toHaveBeenCalledWith(cause, { tags: { context: 'planner:save' } }),
    );
  });
});

describe('reporting the same failure twice', () => {
  it('sends it once, whoever reports it first', async () => {
    vi.mocked(captureException).mockClear();
    const { reportError } = useErrorReporting();
    const cause = { operationName: 'Me', gqlErrors: [] };

    reportError('graphql:Me', cause);
    reportError('menu:composedWeek', cause);

    await vi.waitFor(() => expect(captureException).toHaveBeenCalledOnce());
    // The second report is refused synchronously: nothing more is on its way.
    await Promise.resolve();
    expect(captureException).toHaveBeenCalledOnce();
  });

  it('still sends two different failures', async () => {
    vi.mocked(captureException).mockClear();
    const { reportError } = useErrorReporting();

    reportError('a', new Error('one'));
    reportError('a', new Error('two'));

    await vi.waitFor(() => expect(captureException).toHaveBeenCalledTimes(2));
  });
});
