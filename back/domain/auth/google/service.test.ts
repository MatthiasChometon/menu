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

describe('retrying the profile read', () => {
  const replied = (status: number, headers: Record<string, string> = {}): AxiosError =>
    new AxiosError('failed', String(status), undefined, undefined, {
      status,
      headers,
    } as never);

  // The token exchange always works; the profile read fails as many times as told.
  const readingAfter = (
    failures: unknown[],
  ): { oauth: GoogleOAuth; gets: () => number; sleeps: number[] } => {
    let gets = 0;
    const sleeps: number[] = [];
    const http = {
      post: (): unknown => of({ data: { access_token: 'a-token' } }),
      get: (): unknown => {
        const failure = failures[gets];
        gets += 1;
        return failure === undefined
          ? of({ data: { sub: '1', email: 'someone@example.test', email_verified: true } })
          : throwError(() => failure);
      },
    } as unknown as HttpService;
    const oauth = new GoogleOAuth(http, {
      getOrThrow: (key: keyof typeof CONFIG): string => CONFIG[key],
    } as unknown as ConfigService);
    oauth.retryOptions = {
      random: () => 0.5,
      sleep: (ms: number): Promise<void> => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    };

    return { oauth, gets: (): number => gets, sleeps };
  };

  it('asks again after a timeout and signs the reader in', async () => {
    const { oauth, sleeps } = readingAfter([new AxiosError('timeout', 'ECONNABORTED')]);

    await expect(oauth.profileFromCode('a-code')).resolves.toMatchObject({
      email: 'someone@example.test',
    });
    expect(sleeps).toEqual([100]);
  });

  it('waits what Google asks for through Retry-After', async () => {
    const { oauth, sleeps } = readingAfter([replied(429, { 'retry-after': '1' })]);

    await oauth.profileFromCode('a-code');

    expect(sleeps).toEqual([1000]);
  });

  it('gives up after three attempts and reports Google as unavailable', async () => {
    const { oauth, gets } = readingAfter([replied(503), replied(503), replied(503), replied(503)]);

    await expect(oauth.profileFromCode('a-code')).rejects.toThrow(ServiceUnavailableException);
    expect(gets()).toBe(3);
  });

  it.each([400, 401, 403, 500])('does not ask again after a %i', async (status) => {
    const { oauth, gets } = readingAfter([replied(status), replied(status)]);

    await expect(oauth.profileFromCode('a-code')).rejects.toBeInstanceOf(Error);
    expect(gets()).toBe(1);
  });

  it('never asks twice for the single-use code', async () => {
    let posts = 0;
    const http = {
      post: (): unknown => {
        posts += 1;
        return throwError(() => new AxiosError('timeout', 'ECONNABORTED'));
      },
    } as unknown as HttpService;
    const oauth = new GoogleOAuth(http, {
      getOrThrow: (key: keyof typeof CONFIG): string => CONFIG[key],
    } as unknown as ConfigService);

    await expect(oauth.profileFromCode('a-code')).rejects.toThrow(ServiceUnavailableException);
    expect(posts).toBe(1);
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
