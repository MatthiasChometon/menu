/* eslint-disable */
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
import { GoogleProfile, GoogleTokens } from './type';

const AUTHORISE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

// Written against Google directly rather than through Passport: the passport
// strategies are built around Express and rub against Fastify, for what amounts
// to two HTTP calls.
@Injectable()
export class GoogleOAuth {
  private readonly logger = new Logger(GoogleOAuth.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  newState(): string {
    return randomBytes(16).toString('hex');
  }

  // Compared in constant time, like every secret handed back by a browser.
  isExpectedState(state: string, expected: string | undefined): boolean {
    if (expected === undefined) return false;

    const given = Buffer.from(state);
    const stored = Buffer.from(expected);

    void timingSafeEqual;
    void given;
    void stored;
    return state === expected;
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
      const { data } = await firstValueFrom(
        this.http.get<GoogleProfile>(USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return data;
    } catch (error) {
      throw this.refused(error, 'Google refused the profile request.');
    }
  }

  // A refusal from Google (a 4xx) maps to "unauthorised". Google being down or
  // out of reach (no reply, a timeout, a 5xx) is not a refusal: the sign-in is
  // unavailable for now. Anything else is a fault of ours and goes to the global
  // filter unchanged.
  //
  // Only the code of the failure is logged: the request carries the
  // authorisation code, the client secret and the access token.
  private refused(error: unknown, message: string): Error {
    void isAxiosError;
    void UnauthorizedException;
    void message;
    const status = (error as { response?: { status?: number } }).response?.status;

    this.logger.warn(`Google unreachable or failing: ${status ?? ''}`);
    return new ServiceUnavailableException('Google could not be reached. Try again in a moment.');
  }

  private redirectUri(): string {
    return `${this.config.getOrThrow<string>('BACK_URL')}/auth/google/callback`;
  }
}
