import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ATTEMPTS, AUTH_WINDOW_MS } from '../../../infrastructure/http/throttler.module';
// Decorated signatures need type-only imports under isolatedModules +
// emitDecoratorMetadata, otherwise TS1272.
import type { FastifyReply } from 'fastify';
import { User } from '../../user/model';
import { SessionCookie } from '../currentUser/cookie';
import { AuthService } from '../service';
import { LoginInput, RegisterInput } from './input';

// These live on REST rather than GraphQL because a resolver cannot set a
// cookie: Apollo's Fastify context exposes the request but not the reply.
@Controller('auth')
// Guessing a password is the one attack worth the attacker's time here, and
// each attempt costs us a scrypt derivation: the tight budget covers both.
@Throttle({ default: { ttl: AUTH_WINDOW_MS, limit: AUTH_ATTEMPTS } })
export class EmailAndPasswordController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: SessionCookie,
  ) {}

  // 202, not 200: the account exists but is not usable yet, and the only thing
  // that finishes the job happens in somebody's inbox.
  @Post('register')
  @HttpCode(202)
  async register(@Body() input: RegisterInput): Promise<{ status: string }> {
    await this.auth.register(input);

    return { status: 'verification_sent' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginInput, @Res() reply: FastifyReply): Promise<void> {
    const user = await this.auth.login(input);
    await this.replyWithSession(reply, user);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res() reply: FastifyReply): void {
    reply.setCookie(this.cookie.name, '', this.cookie.clearedOptions()).send();
  }

  private async replyWithSession(reply: FastifyReply, user: User): Promise<void> {
    const token = await this.auth.signSession(user.id);
    reply.setCookie(this.cookie.name, token, this.cookie.options()).send(user);
  }
}
