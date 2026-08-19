import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ATTEMPTS, AUTH_WINDOW_MS } from '../../../infrastructure/http/throttler.module';
// Decorated signatures need type-only imports under isolatedModules +
// emitDecoratorMetadata, otherwise TS1272.
import type { FastifyReply } from 'fastify';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { ForgotPasswordInput, ResetPasswordInput } from './input';
import { PasswordResetService } from './service';

// REST rather than GraphQL for the same reason the rest of auth is: a resolver
// cannot set a cookie, and finishing a reset signs the reader in.
@Controller('auth')
// Asking for links is free mail sent on somebody else's behalf, and guessing a
// token is only hard while guesses are rationed.
@Throttle({ default: { ttl: AUTH_WINDOW_MS, limit: AUTH_ATTEMPTS } })
export class PasswordResetController {
  constructor(
    private readonly reset: PasswordResetService,
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  // Always 204, whatever happened. Answering differently for a known and an
  // unknown address would make this the cheapest way to enumerate accounts.
  @Post('forgot-password')
  @HttpCode(204)
  async forgot(@Body() { email }: ForgotPasswordInput): Promise<void> {
    await this.reset.request(email);
  }

  // Signed in on the spot: they have just proved they own the address, which is
  // more than the old password proved.
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() { token, password }: ResetPasswordInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const user = await this.reset.reset(token, password);
    const session = await this.auth.signSession(user.id);

    reply.setCookie(this.cookie.name, session, this.cookie.options()).send(user);
  }
}
