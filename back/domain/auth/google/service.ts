import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile, GoogleTokens } from './type';

const AUTHORISE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

// Written against Google directly rather than through Passport: the passport
// strategies are built around Express and rub against Fastify, for what amounts
// to two HTTP calls.
@Injectable()
export class GoogleOAuth {
  constructor(private readonly config: ConfigService) {}

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
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Google refused the profile request.');
    }

    const profile = (await response.json()) as GoogleProfile;

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
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!response.ok) {
      throw new UnauthorizedException('Google refused the authorisation code.');
    }

    return (await response.json()) as GoogleTokens;
  }

  private redirectUri(): string {
    return `${this.config.getOrThrow<string>('BACK_URL')}/auth/google/callback`;
  }
}
