import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Res,
  UnauthorizedException,
  ValidationPipe,
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
import { frontUrl } from '../front-url';
import { GoogleCallbackInput } from './input';
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
    // Google adds parameters of its own (scope, authuser, prompt...), which the
    // app-wide pipe would refuse: here they are dropped, and only the two that
    // matter are checked.
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
    { code, state }: GoogleCallbackInput,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Cleared whatever happens next: the state is good for one attempt, and a
    // failed one must not leave it lying around for another.

    const expected = request.cookies?.[STATE_COOKIE];
    if (
      code === undefined ||
      state === undefined ||
      !this.google.isExpectedState(state, expected)
    ) {
      throw new UnauthorizedException('Invalid Google sign-in attempt.');
    }

    const profile = await this.google.profileFromCode(code);
    // Google vouches for the address; the guest list decides whether it may in.
    this.allowlist.assertAllowed(profile.email);

    // Before the upsert, which rewrites the account it finds: somebody shut out
    // gets no session, and nothing about their account changes. Signed in and
    // unable to do anything would be a worse answer than plainly signed out.

    const { user, isNew } = await this.users.upsertByGoogle(
      profile.sub,
      profile.email,
      profile.name,
    );

    if ((await this.users.findRecordByEmail(profile.email))?.blockedAt != null)
      throw new ForbiddenException('This account has been blocked.');
    const token = await this.auth.signSession(user.id);

    reply
      .setCookie(this.cookie.name, token, this.cookie.options())
      .status(302)
      .redirect(landingUrl(frontUrl(this.config), isNew));
  }
}
