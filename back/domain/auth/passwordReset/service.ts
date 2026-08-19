import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../infrastructure/mail/service';
import { User } from '../../user/model';
import { UserMapper } from '../../user/mapper';
import { UserRepository } from '../../user/repository';
import { PasswordService } from '../emailAndPassword/password.service';
import { AuthTokenRepository, PASSWORD_RESET } from '../tokens/repository';
import { passwordResetEmail } from './emails';

// An hour. Shorter than a verification link, because this one changes a
// password rather than confirming an address, and because somebody asking for
// it is at their keyboard right now.
const TTL_MS = 60 * 60 * 1000;

const RESET_PATH = '/reinitialisation';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly mapper: UserMapper,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Sends a link, and says nothing about whether there was anyone to send it
   *  to. The caller is not signed in, so an honest answer would turn this into
   *  a way to test which addresses have accounts here. */
  async request(email: string): Promise<void> {
    const record = await this.users.findRecordByEmail(email);
    if (record === undefined) return;

    const token = await this.tokens.issue(record.id, PASSWORD_RESET, TTL_MS);
    const front = this.config.getOrThrow<string>('FRONT_URL').replace(/\/+$/, '');

    await this.mail.send(
      passwordResetEmail(record.email, `${front}${RESET_PATH}?token=${token}`, record.locale),
    );
  }

  /** Spends the link and sets the new password. Every session signed before now
   *  stops working, which is the point: a reset exists for the case where
   *  somebody else is already inside. */
  async reset(token: string, password: string): Promise<User> {
    const userId = await this.tokens.consume(token, PASSWORD_RESET);
    if (userId === undefined) {
      throw new UnauthorizedException('This link is no longer valid. Ask for a new one.');
    }

    const record = await this.users.replacePassword(userId, await this.passwords.hash(password));

    // Through the mapper, always: a REST reply serialises whatever object it is
    // handed, and the raw row carries the password hash.
    return this.mapper.toUser(record);
  }
}
