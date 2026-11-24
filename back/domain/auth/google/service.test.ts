import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { googleHttpModule } from './http';
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

describe('when Google does not answer properly', () => {
  const failingWith = (error: unknown): GoogleOAuth => {
    const http = { post: (): unknown => throwError(() => error) } as unknown as HttpService;

    return new GoogleOAuth(http, {
      getOrThrow: (key: keyof typeof CONFIG): string => CONFIG[key],
    } as unknown as ConfigService);
  };

  const replied = (status: number): AxiosError =>
    new AxiosError('failed', String(status), undefined, undefined, { status } as never);

  it('reads a refusal from Google as unauthorised', async () => {
    await expect(failingWith(replied(400)).profileFromCode('a-code')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it.each([408, 429])(
    'reads a %i from Google as unavailable for now, not as a refusal',
    async (status) => {
      await expect(failingWith(replied(status)).profileFromCode('a-code')).rejects.toThrow(
        ServiceUnavailableException,
      );
    },
  );

  it('reads a Google outage as unavailable', async () => {
    await expect(failingWith(replied(503)).profileFromCode('a-code')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('reads silence or a timeout as Google being unavailable', async () => {
    const error = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED');

    await expect(failingWith(error).profileFromCode('a-code')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('lets a fault of ours through unchanged instead of calling it Google’s', async () => {
    const fault = new TypeError('our own bug');

    await expect(failingWith(fault).profileFromCode('a-code')).rejects.toBe(fault);
  });
});

describe('the wiring of calls to Google', () => {
  it('caps every call at five seconds', async () => {
    const module = await Test.createTestingModule({ imports: [googleHttpModule] }).compile();

    expect(module.get(HttpService).axiosRef.defaults.timeout).toBe(5000);
  });
});

describe('checking the state that came back', () => {
  const oauth = oauthReading({});

  it('accepts the one it issued', () => {
    expect(oauth.isExpectedState('abc', 'abc')).toBe(true);
  });

  it('refuses another, a different length and a missing cookie', () => {
    expect(oauth.isExpectedState('abd', 'abc')).toBe(false);
    expect(oauth.isExpectedState('ab', 'abc')).toBe(false);
    expect(oauth.isExpectedState('abc', undefined)).toBe(false);
  });
});
