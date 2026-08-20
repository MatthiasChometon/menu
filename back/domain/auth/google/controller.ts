import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_WINDOW_MS, GOOGLE_ATTEMPTS } from '../../../infrastructure/http/throttler.module';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { Req } from '@nestjs/common';
import { UserRepository } from '../../user/repository';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { GoogleOAuth } from './service';
import { landingUrl } from './landing';
import { EmailAllowlist } from '../allowlist.service';

const STATE_COOKIE = 'oauth_state';

@Controller('auth/google')
@Throttle({ default: { ttl: AUTH_WINDOW_MS, limit: GOOGLE_ATTEMPTS } })
export class GoogleController {
  constructor(
    private readonly google: GoogleOAuth,
    private readonly users: UserRepository,
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
    private readonly config: ConfigService,
    private readonly allowlist: EmailAllowlist,
  ) {}

  @Get()
  start(@Res() reply: FastifyReply): void {
    const state = this.google.newState();

    // Round-tripped through a short-lived cookie and compared on return: this
    // is what stops someone else's authorisation code being fed to our callback.
    reply
      .setCookie(STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.get<string>('NODE_ENV') === 'production',
        path: '/',
        maxAge: 600,
      })
      // A bare redirect() answers 200 under Fastify, which browsers do not
      // follow; the status has to be explicit.
      .status(302)
      .redirect(this.google.authorisationUrl(state));
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const expected = request.cookies?.[STATE_COOKIE];
    if (code === undefined || state === undefined || state !== expected) {
      throw new UnauthorizedException('Invalid Google sign-in attempt.');
    }

    const profile = await this.google.profileFromCode(code);
    // Google vouches for the address; the guest list decides whether it may in.
    this.allowlist.assertAllowed(profile.email);

    const { user, isNew } = await this.users.upsertByGoogle(
      profile.sub,
      profile.email,
      profile.name,
    );

    // A blocked account gets no session at all, rather than one the guard would
    // refuse a moment later: signed in and unable to do anything is a worse
    // answer than plainly signed out.
    const record = await this.users.findRecordById(user.id);
    if (record?.blockedAt != null) {
      throw new ForbiddenException('This account has been blocked.');
    }

    const token = await this.auth.signSession(user.id);

    reply
      .setCookie(this.cookie.name, token, this.cookie.options())
      .setCookie(STATE_COOKIE, '', { path: '/', maxAge: 0 })
      .status(302)
      .redirect(landingUrl(this.config.getOrThrow<string>('FRONT_URL'), isNew));
  }
}
