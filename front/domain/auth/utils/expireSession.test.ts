import { describe, expect, it, vi } from 'vitest';
import { createSessionExpiry, type SessionExpiryContext } from './expireSession';

const setup = (
  overrides: Partial<SessionExpiryContext> = {},
): {
  expire: () => Promise<void>;
  clearSession: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
} => {
  const clearSession = vi.fn();
  const navigate = vi.fn().mockResolvedValue(undefined);
  const expire = createSessionExpiry({
    hasSession: (): boolean => true,
    clearSession,
    signInPath: (): string => '/profil',
    currentPath: (): string => '/courses-auto?week=3',
    navigate,
    ...overrides,
  });

  return { expire, clearSession, navigate };
};

describe('when the session ended on the server', () => {
  it('forgets the user and sends them to sign in, keeping where they were', async () => {
    const { expire, clearSession, navigate } = setup();

    await expire();

    expect(clearSession).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/profil',
      query: { redirect: '/courses-auto?week=3' },
    });
  });

  it('does not keep a path that is not of this site', async () => {
    const { expire, navigate } = setup({ currentPath: (): string => '//evil.example/x' });

    await expire();

    expect(navigate).toHaveBeenCalledExactlyOnceWith('/profil');
  });

  it('does nothing for somebody who was not signed in', async () => {
    const { expire, clearSession, navigate } = setup({ hasSession: (): boolean => false });

    await expire();

    expect(clearSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('forgets the user but does not navigate when already on the sign-in page', async () => {
    const { expire, clearSession, navigate } = setup({ currentPath: (): string => '/profil' });

    await expire();

    expect(clearSession).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['/profil/', '/profil/?redirect=%2Fx', '/profil/#top'])(
    'does not navigate when already on the sign-in page as %s',
    async (here) => {
      const { expire, navigate } = setup({ currentPath: (): string => here });

      await expire();

      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('leaves once when several calls fail together', async () => {
    const { expire, navigate } = setup();

    await Promise.all([expire(), expire(), expire()]);

    expect(navigate).toHaveBeenCalledOnce();
  });
});
