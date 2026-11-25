import { captureException } from '@sentry/vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

describe('reporting a handled error', () => {
  it('sends the error to Sentry, tagged with where it happened', () => {
    const { reportError } = useErrorReporting();
    const cause = new Error('network down');

    reportError('planner:save', cause);

    expect(captureException).toHaveBeenCalledWith(cause, { tags: { context: 'planner:save' } });
  });
});

describe('reporting the same failure twice', () => {
  it('sends it once, whoever reports it first', () => {
    vi.mocked(captureException).mockClear();
    const { reportError } = useErrorReporting();
    const cause = { operationName: 'Me', gqlErrors: [] };

    reportError('graphql:Me', cause);
    reportError('menu:composedWeek', cause);

    expect(captureException).toHaveBeenCalledOnce();
  });

  it('still sends two different failures', () => {
    vi.mocked(captureException).mockClear();
    const { reportError } = useErrorReporting();

    reportError('a', new Error('one'));
    reportError('a', new Error('two'));

    expect(captureException).toHaveBeenCalledTimes(2);
  });
});
