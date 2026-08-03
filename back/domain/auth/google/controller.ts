import { Controller, Get, Query, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { Req } from '@nestjs/common';
import { UserRepository } from '../../user/repository';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { GoogleOAuth } from './service';

const STATE_COOKIE = 'oauth_state';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly google: GoogleOAuth,
    private readonly users: UserRepository,
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
    private readonly config: ConfigService,
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
    const user = await this.users.upsertByGoogle(profile.sub, profile.email, profile.name);
    const token = await this.auth.signSession(user.id);

    reply
      .setCookie(this.cookie.name, token, this.cookie.options())
      .setCookie(STATE_COOKIE, '', { path: '/', maxAge: 0 })
      .status(302)
      .redirect(this.config.getOrThrow<string>('FRONT_URL'));
  }
}
