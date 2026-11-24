import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../../../infrastructure/database/token';
import { authToken } from './schema';
import type { AuthTokenType } from './type';

export const EMAIL_VERIFICATION = 'email_verification' satisfies AuthTokenType;
export const PASSWORD_RESET = 'password_reset' satisfies AuthTokenType;

const TOKEN_BYTES = 32;

// SHA-256, not scrypt: the token is 32 random bytes, so there is no guessing to
// slow down — only a stored value to make useless if the table ever leaks.
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  /** Mints a link and returns the only readable copy of it. What is kept is the
   *  hash, so a dump of this table opens nothing. */
  async issue(userId: string, type: AuthTokenType, ttlMs: number): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = digest(token);
    const expiresAt = new Date(Date.now() + ttlMs);

    // Replacing rather than adding: asking for a second link has to retire the
    // first, or a message forwarded once leaves a door open for its whole TTL.
    await this.database
      .insert(authToken)
      .values({ userId, type, tokenHash, expiresAt })
      .onConflictDoUpdate({
        target: [authToken.userId, authToken.type],
        set: { tokenHash, expiresAt },
      });

    return token;
  }

  /** Spends the link and runs `apply` with whose account it opened, in one
   *  transaction: if `apply` fails the link is still good for another try.
   *
   *  Returns nothing at all if the token is unknown, already used or out of
   *  date — the three cases are one answer on purpose, since telling them apart
   *  helps only an attacker. */
  async spend<Result>(
    token: string,
    type: AuthTokenType,
    apply: (userId: string, executor: DatabaseExecutor) => Promise<Result>,
  ): Promise<Result | undefined> {
    return this.database.transaction(async (transaction): Promise<Result | undefined> => {
      const userId = await this.takeOwner(token, type, transaction);

      return userId === undefined ? undefined : apply(userId, transaction);
    });
  }

  // Deleted and read in one statement: two requests spending the same link at
  // once cannot both find it, so only one of them gets the account.
  //
  // Deleted whether or not it had expired: a spent link is spent, and an
  // expired row left behind is a row somebody has to clean up later.
  private async takeOwner(
    token: string,
    type: AuthTokenType,
    executor: DatabaseExecutor,
  ): Promise<string | undefined> {
    const [record] = await executor
      .delete(authToken)
      .where(and(eq(authToken.tokenHash, digest(token)), eq(authToken.type, type)))
      .returning();

    if (record === undefined || record.expiresAt.getTime() < Date.now()) return undefined;

    return record.userId;
  }
}
