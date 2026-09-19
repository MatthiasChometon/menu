import { randomBytes } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  newState(): string {
    return randomBytes(16).toString('hex');
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

  // A reply from Google that is not a success maps to "unauthorised", the same
  // verdict the old !response.ok branch reached. A network-level failure — no
  // reply at all — is not Google refusing anything, so it bubbles up unchanged.
  private refused(error: unknown, message: string): Error {
    if (isAxiosError(error) && error.response !== undefined) {
      return new UnauthorizedException(message);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private redirectUri(): string {
    return `${this.config.getOrThrow<string>('BACK_URL')}/auth/google/callback`;
  }
}
