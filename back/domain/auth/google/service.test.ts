import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleOAuth } from './service';

const CONFIG = {
  GOOGLE_CLIENT_ID: 'a-client',
  GOOGLE_CLIENT_SECRET: 'a-secret',
  BACK_URL: 'https://example.test',
} as const;

const oauth = (): GoogleOAuth =>
  new GoogleOAuth({
    getOrThrow: (key: keyof typeof CONFIG): string => CONFIG[key],
  } as unknown as ConfigService);

// Two calls in order: the code is exchanged for a token, then the token reads
// the profile. Only the second one differs between these tests.
const googleAnswers = (profile: Record<string, unknown>): void => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: (): Promise<unknown> => Promise.resolve({ access_token: 'a-token' }),
      })
      .mockResolvedValueOnce({ ok: true, json: (): Promise<unknown> => Promise.resolve(profile) }),
  );
};

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('reading a profile from Google', () => {
  it('accepts an address Google vouches for', async (): Promise<void> => {
    googleAnswers({
      sub: '1',
      email: 'someone@example.test',
      email_verified: true,
      name: 'Someone',
    });

    const profile = await oauth().profileFromCode('a-code');

    expect(profile.email).toBe('someone@example.test');
  });

  it('refuses an address Google has not confirmed', async (): Promise<void> => {
    // A Workspace domain can hold one. Taken at face value it would let its
    // owner sign in as whoever that address belongs to here — including,
    // if the address happened to be listed, an administrator.
    googleAnswers({ sub: '1', email: 'admin@example.test', email_verified: false });

    await expect(oauth().profileFromCode('a-code')).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a profile that says nothing about the address at all', async (): Promise<void> => {
    googleAnswers({ sub: '1', email: 'admin@example.test' });

    await expect(oauth().profileFromCode('a-code')).rejects.toThrow(UnauthorizedException);
  });
});
