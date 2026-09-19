import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { GoogleOAuth } from './service';

const CONFIG = {
  GOOGLE_CLIENT_ID: 'a-client',
  GOOGLE_CLIENT_SECRET: 'a-secret',
  BACK_URL: 'https://example.test',
} as const;

// Two calls in order: the code is exchanged for a token (POST), then the token
// reads the profile (GET). Only the profile differs between these tests, so the
// token answer is fixed and the GET returns whatever Google is made to say.
const oauthReading = (profile: Record<string, unknown>): GoogleOAuth => {
  const http = {
    post: (): unknown => of({ data: { access_token: 'a-token' } }),
    get: (): unknown => of({ data: profile }),
  } as unknown as HttpService;

  return new GoogleOAuth(http, {
    getOrThrow: (key: keyof typeof CONFIG): string => CONFIG[key],
  } as unknown as ConfigService);
};

describe('reading a profile from Google', () => {
  it('accepts an address Google vouches for', async (): Promise<void> => {
    const profile = await oauthReading({
      sub: '1',
      email: 'someone@example.test',
      email_verified: true,
      name: 'Someone',
    }).profileFromCode('a-code');

    expect(profile.email).toBe('someone@example.test');
  });

  it('refuses an address Google has not confirmed', async (): Promise<void> => {
    // A Workspace domain can hold one. Taken at face value it would let its
    // owner sign in as whoever that address belongs to here — including,
    // if the address happened to be listed, an administrator.
    const reading = oauthReading({ sub: '1', email: 'admin@example.test', email_verified: false });

    await expect(reading.profileFromCode('a-code')).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a profile that says nothing about the address at all', async (): Promise<void> => {
    const reading = oauthReading({ sub: '1', email: 'admin@example.test' });

    await expect(reading.profileFromCode('a-code')).rejects.toThrow(UnauthorizedException);
  });
});
