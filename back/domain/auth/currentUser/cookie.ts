import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieSerializeOptions } from '@fastify/cookie';

@Injectable()
export class SessionCookie {
  constructor(private readonly config: ConfigService) {}

  get name(): string {
    return 'session';
  }

  options(): CookieSerializeOptions {
    return {
      httpOnly: true,
      // Front and back share a site, so Lax still sends the cookie while
      // keeping it away from cross-site requests.
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
      maxAge: this.maxAgeSeconds(),
    };
  }

  clearedOptions(): CookieSerializeOptions {
    return { ...this.options(), maxAge: 0 };
  }

  maxAgeSeconds(): number {
    return 60 * 60 * 24 * 30;
  }
}
