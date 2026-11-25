import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  isTransientStatus,
  retryAfterMs,
  retryTransient,
  type RetryOptions,
  type Transient,
} from '../../../infrastructure/http/retry';
import { GoogleProfile, GoogleTokens } from './type';
import { stateCarrying } from './redirect';

const AUTHORISE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

// Not a refusal of the code: Google asking to come back later.
const TRY_AGAIN_STATUSES: ReadonlySet<number> = new Set([408, 429]);

// A reply we never got (timeout, connection reset) or one asking to come back
// later. Not a refusal, so worth asking again.
const transientOf = (error: unknown): Transient | undefined => {
  if (!isAxiosError(error)) return undefined;
  if (error.response === undefined) return {};
  if (!isTransientStatus(error.response.status)) return undefined;

  return { retryAfterMs: retryAfterMs(error.response.headers['retry-after']) };
};

// Written against Google directly rather than through Passport: the passport
// strategies are built around Express and rub against Fastify, for what amounts
// to two HTTP calls.
@Injectable()
export class GoogleOAuth {
  private readonly logger = new Logger(GoogleOAuth.name);

  // Left alone in production; a test pins the jitter and skips the waiting.
  retryOptions: Partial<RetryOptions> = {};

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // The page the reader came from rides along, so the one check on the way back
  // (against the cookie) covers it too.
  newState(redirect?: unknown): string {
    return stateCarrying(randomBytes(16).toString('hex'), redirect);
  }

  // Compared in constant time, like every secret handed back by a browser.
  isExpectedState(state: string, expected: string | undefined): boolean {
    if (expected === undefined) return false;

    const given = Buffer.from(state);
    const stored = Buffer.from(expected);

    return given.length === stored.length && timingSafeEqual(given, stored);
  }

  authorisationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return `${AUTHORISE_URL}?${params.toString()}`;
  }

  async profileFromCode(code: string): Promise<GoogleProfile> {
    const tokens = await this.exchange(code);
    const profile = await this.userinfo(tokens.access_token);

    // The address is what decides which account this is — and, further along,
    // whether that account administers the site. Google only vouches for it
    // when it says so: a Workspace domain can hold an unverified address, and
    // taking one at face value would let its owner arrive as somebody else.
    // Absent counts as unverified: silence is not a guarantee.
    if (profile.email_verified !== true) {
      throw new UnauthorizedException('Google has not confirmed that address.');
    }

    return profile;
  }

  private async exchange(code: string): Promise<GoogleTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.redirectUri(),
      grant_type: 'authorization_code',
    });
    try {
      const { data } = await firstValueFrom(
        this.http.post<GoogleTokens>(TOKEN_URL, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return data;
    } catch (error) {
      throw this.refused(error, 'Google refused the authorisation code.');
    }
  }

  private async userinfo(accessToken: string): Promise<GoogleProfile> {
    try {
      // Reading a profile has no effect, so asking again is safe. The code
      // exchange above is not retried: an authorisation code is single-use.
      const { data } = await retryTransient(
        () =>
          firstValueFrom(
            this.http.get<GoogleProfile>(USERINFO_URL, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ),
        transientOf,
        this.retryOptions,
      );
      return data;
    } catch (error) {
      throw this.refused(error, 'Google refused the profile request.');
    }
  }

  // A refusal from Google (a 4xx, bar 408 and 429, which mean "later") maps to
  // "unauthorised". Google being down or out of reach (no reply, a timeout, a
  // 5xx) is not a refusal: the sign-in is unavailable for now. Anything else is
  // a fault of ours and goes to the global filter unchanged.
  //
  // Only the code of the failure is logged: the request carries the
  // authorisation code, the client secret and the access token.
  private refused(error: unknown, message: string): Error {
    if (!isAxiosError(error)) return error instanceof Error ? error : new Error(String(error));

    const status = error.response?.status;
    if (status !== undefined && status < 500 && !TRY_AGAIN_STATUSES.has(status)) {
      return new UnauthorizedException(message);
    }

    this.logger.warn(`Google unreachable or failing: ${error.code ?? 'no code'} ${status ?? ''}`);
    return new ServiceUnavailableException('Google could not be reached. Try again in a moment.');
  }

  private redirectUri(): string {
    return `${this.config.getOrThrow<string>('BACK_URL')}/auth/google/callback`;
  }
}
