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
