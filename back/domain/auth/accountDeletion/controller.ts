import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_ATTEMPTS, AUTH_WINDOW_MS } from '../../../infrastructure/http/throttler.module';
// Decorated signatures need type-only imports under isolatedModules +
// emitDecoratorMetadata, otherwise TS1272.
import type { FastifyReply } from 'fastify';
import { User } from '../../user/model';
import { UserRepository } from '../../user/repository';
import { CurrentUser } from '../currentUser/current-user';
import { SessionCookie } from '../currentUser/cookie';
import { AuthGuard } from '../currentUser/guard';
import { PasswordService } from '../emailAndPassword/password.service';
import { DeleteAccountInput } from './input';

// REST rather than GraphQL, like the rest of auth: a resolver cannot clear a
// cookie, and leaving a session behind that names an account which no longer
// exists is the one thing this route must not do.
@Controller('auth')
@Throttle({ default: { ttl: AUTH_WINDOW_MS, limit: AUTH_ATTEMPTS } })
export class AccountDeletionController {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly cookie: SessionCookie,
  ) {}

  @Post('delete-account')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async deleteAccount(
    @CurrentUser() user: User,
    @Body() { password }: DeleteAccountInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const record = await this.users.findRecordById(user.id);

    // A password on the account means it has to be typed. Skipping the check
    // when one exists would make the session alone enough to destroy the data.
    if (record?.passwordHash !== undefined && record?.passwordHash !== null) {
      if (password === undefined || !(await this.passwords.verify(password, record.passwordHash))) {
        throw new UnauthorizedException('Wrong password.');
      }
    }

    await this.users.deleteById(user.id);

    // Cleared in the same breath: a cookie naming a deleted account would fail
    // every request afterwards without ever saying why.
    reply.setCookie(this.cookie.name, '', this.cookie.clearedOptions()).send();
  }
}
