import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_WINDOW_MS, AUTH_ATTEMPTS } from '../../../infrastructure/http/throttler.module';
// Decorated signatures need type-only imports under isolatedModules +
// emitDecoratorMetadata, otherwise TS1272.
import type { FastifyReply } from 'fastify';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { EmailVerificationService } from './service';
import { ResendVerificationInput, VerifyEmailInput } from './input';

// REST rather than GraphQL for the same reason the rest of auth is: a resolver
// cannot set a cookie, and verifying a link signs the reader in.
@Controller('auth')
// A verification link is guessable only in theory, but asking for new ones is
// free mail we would be sending on somebody else's behalf.
@Throttle({ default: { ttl: AUTH_WINDOW_MS, limit: AUTH_ATTEMPTS } })
export class EmailVerificationController {
  constructor(
    private readonly verification: EmailVerificationService,
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  // Signing in on the spot rather than sending the reader back to a login form:
  // they have just proved they own the address, which is more than a password
  // would have proved.
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() { token }: VerifyEmailInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const user = await this.verification.verify(token);
    const session = await this.auth.signSession(user.id);

    reply.setCookie(this.cookie.name, session, this.cookie.options()).send(user);
  }

  // Always 204, whatever happened. Answering differently for a known and an
  // unknown address would make this the cheapest way to enumerate accounts.
  @Post('resend-verification')
  @HttpCode(204)
  async resend(@Body() { email }: ResendVerificationInput): Promise<void> {
    await this.verification.resend(email);
  }
}
