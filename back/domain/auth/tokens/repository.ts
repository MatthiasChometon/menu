import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infrastructure/database/token';
import { authToken } from './schema';

export const EMAIL_VERIFICATION = 'email_verification';
export const PASSWORD_RESET = 'password_reset';

const TOKEN_BYTES = 32;

// SHA-256, not scrypt: the token is 32 random bytes, so there is no guessing to
// slow down — only a stored value to make useless if the table ever leaks.
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  /** Mints a link and returns the only readable copy of it. What is kept is the
   *  hash, so a dump of this table opens nothing. */
  async issue(userId: string, type: string, ttlMs: number): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');

    // Replacing rather than adding: asking for a second link has to retire the
    // first, or a message forwarded once leaves a door open for its whole TTL.
    await this.database
      .insert(authToken)
      .values({ userId, type, tokenHash: digest(token), expiresAt: new Date(Date.now() + ttlMs) })
      .onConflictDoUpdate({
        target: [authToken.userId, authToken.type],
        set: { tokenHash: digest(token), expiresAt: new Date(Date.now() + ttlMs) },
      });

    return token;
  }

  /** Spends the link. Returns whose account it opened, or nothing at all if the
   *  token is unknown, already used or out of date — the three cases are one
   *  answer on purpose, since telling them apart helps only an attacker. */
  async consume(token: string, type: string): Promise<string | undefined> {
    const [record] = await this.database
      .select()
      .from(authToken)
      .where(and(eq(authToken.tokenHash, digest(token)), eq(authToken.type, type)));

    if (record === undefined) return undefined;

    // Deleted whether or not it had expired: a spent link is spent, and an
    // expired row left behind is a row somebody has to clean up later.
    await this.database
      .delete(authToken)
      .where(and(eq(authToken.userId, record.userId), eq(authToken.type, type)));

    return record.expiresAt.getTime() < Date.now() ? undefined : record.userId;
  }

  /** Drops links nobody can use any more. Nothing depends on this running —
   *  consume() checks the date itself — it only keeps the table honest. */
  async dropExpired(): Promise<void> {
    await this.database.delete(authToken).where(lt(authToken.expiresAt, new Date()));
  }
}
