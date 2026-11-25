import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { gqlMe } = vi.hoisted(() => ({ gqlMe: vi.fn() }));

mockNuxtImport('GqlMe', () => gqlMe);

describe('useAuth', () => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });

  afterEach((): void => {
    vi.useRealTimers();
    gqlMe.mockReset();
  });

  it('leaves no deadline timer behind once the API has answered', async () => {
    gqlMe.mockResolvedValue({ me: { id: 'u1', hasPassword: true } });
    const { refresh } = useAuth();

    await refresh();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('treats an API that never answers as signed out once the deadline passes', async () => {
    gqlMe.mockReturnValue(new Promise<never>(() => undefined));
    const { refresh, user } = useAuth();

    const pending = refresh();
    await vi.advanceTimersByTimeAsync(12_000);
    await pending;

    expect(user.value).toBeUndefined();
  });
});
