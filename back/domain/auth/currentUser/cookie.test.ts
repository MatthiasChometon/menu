import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { SessionCookie } from './cookie';

const cookieFor = (values: Record<string, string | undefined>): SessionCookie =>
  new SessionCookie({
    get: (key: string): string | undefined => values[key],
  } as ConfigService);

describe('the session cookie', () => {
  it('stays on Lax when the front is served from the same host', () => {
    const options = cookieFor({
      FRONT_URL: 'http://localhost:3777',
      BACK_URL: 'http://localhost:3779',
    }).options();

    // Same host, so the stricter setting still lets the cookie through.
    expect(options.sameSite).toBe('lax');
  });

  it('switches to None once the front lives on another host', () => {
    const options = cookieFor({
      FRONT_URL: 'https://menu-semaine-887.netlify.app',
      BACK_URL: 'https://menu-api-chometon.onrender.com',
      NODE_ENV: 'production',
    }).options();

    // Lax here means the browser never sends the session with the front's
    // calls: sign-in completes, the redirect lands, and the reader is still
    // anonymous. This is the setting that made that bug possible.
    expect(options.sameSite).toBe('none');
    // None is ignored without Secure, which would put us straight back.
    expect(options.secure).toBe(true);
  });

  it('scopes the cookie to the parent domain when the front and API are sibling subdomains', () => {
    const options = cookieFor({
      FRONT_URL: 'https://menu.mtxlab.xyz',
      BACK_URL: 'https://api.menu.mtxlab.xyz',
      COOKIE_DOMAIN: 'menu.mtxlab.xyz',
    }).options();

    // Issued for the shared parent, so it reaches both subdomains as a
    // first-party Lax cookie — the setup Safari does not block.
    expect(options.domain).toBe('menu.mtxlab.xyz');
    expect(options.sameSite).toBe('lax');
    expect(options.secure).toBe(true);
  });

  it('carries the domain through to the cleared cookie so signing out matches', () => {
    const cookie = cookieFor({
      FRONT_URL: 'https://menu.mtxlab.xyz',
      BACK_URL: 'https://api.menu.mtxlab.xyz',
      COOKIE_DOMAIN: 'menu.mtxlab.xyz',
    });

    expect(cookie.clearedOptions().domain).toBe('menu.mtxlab.xyz');
    expect(cookie.clearedOptions().maxAge).toBe(0);
  });

  it('does not loosen itself when the addresses are missing or malformed', () => {
    expect(cookieFor({}).options().sameSite).toBe('lax');
    expect(cookieFor({ FRONT_URL: 'not a url', BACK_URL: 'nor this' }).options().sameSite).toBe(
      'lax',
    );
  });

  it('clears with the same attributes it was set with', () => {
    const cookie = cookieFor({
      FRONT_URL: 'https://menu-semaine-887.netlify.app',
      BACK_URL: 'https://menu-api-chometon.onrender.com',
    });

    // A cookie is only replaced when the attributes match; a mismatch leaves
    // the old one in place and signing out does nothing.
    expect(cookie.clearedOptions().sameSite).toBe(cookie.options().sameSite);
    expect(cookie.clearedOptions().secure).toBe(cookie.options().secure);
    expect(cookie.clearedOptions().maxAge).toBe(0);
  });
});
