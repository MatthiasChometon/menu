import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieSerializeOptions } from '@fastify/cookie';

@Injectable()
export class SessionCookie {
  constructor(private readonly config: ConfigService) {}

  get name(): string {
    return 'session';
  }

  // Whether the front is served from somewhere else entirely. Under compose the
  // two share a host and Lax is the stronger choice; deployed, the front sits on
  // netlify.app and this API on onrender.com, and Lax then means the browser
  // withholds the session from every call the front makes. Sign-in appears to
  // work, the redirect lands, and the reader is still anonymous.
  //
  // None is what a split-domain deployment requires. What keeps it from being a
  // CSRF hole is the origin allowlist: no other site is answered at all.
  private isCrossSite(): boolean {
    const front = this.config.get<string>('FRONT_URL');
    const back = this.config.get<string>('BACK_URL');
    if (front === undefined || back === undefined) return false;

    try {
      return new URL(front).hostname !== new URL(back).hostname;
    } catch {
      // A malformed URL is not a reason to loosen the cookie.
      return false;
    }
  }

  options(): CookieSerializeOptions {
    // Same-site across sibling subdomains (menu.mtxlab.xyz + api.menu.mtxlab.xyz):
    // the cookie is issued for the shared parent domain, first-party for both the
    // app and the api subdomain. Safari keeps it — it is not a third-party cookie —
    // and it stays httpOnly and Lax. This is the setting that fixes iPhone sign-in,
    // and it takes precedence over the cross-site (None) fallback below.
    const domain = this.config.get<string>('COOKIE_DOMAIN') || undefined;
    if (domain !== undefined) {
      return {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        domain,
        maxAge: this.maxAgeSeconds(),
      };
    }

    const crossSite = this.isCrossSite();

    return {
      httpOnly: true,
      sameSite: crossSite ? 'none' : 'lax',
      // None is only honoured on a secure connection, so it is not optional here.
      secure: crossSite || this.config.get<string>('NODE_ENV') === 'production',
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
