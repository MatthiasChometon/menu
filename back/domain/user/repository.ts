import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { UserMapper } from './mapper';
import { User } from './model';
import { user } from './schema';
import { UserRecord } from './type';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly mapper: UserMapper,
  ) {}

  // Created unverified on purpose: emailVerifiedAt stays null until somebody
  // follows the link, which is the whole point of sending one. The raw record
  // goes back because the caller has to mail that person straight away.
  async create(
    email: string,
    passwordHash: string,
    name?: string,
    locale?: string,
  ): Promise<UserRecord> {
    const [record] = await this.database
      .insert(user)
      .values({ email, passwordHash, name: name ?? null, locale: locale ?? 'fr' })
      .returning();

    return record;
  }

  async markEmailVerified(id: string): Promise<User> {
    const [record] = await this.database
      .update(user)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    return this.mapper.toUser(record);
  }

  // The only method handing back the raw row: signing in needs the hash to
  // compare against.
  async findRecordByEmail(email: string): Promise<UserRecord | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.email, email));

    return record;
  }

  // Looked up by email first, not by google id: when an address already has a
  // password account, Google signs into that same account instead of tripping
  // the unique constraint on email.
  // Whether the account was opened by this very sign-in, which is what tells
  // the caller it is somebody's first time here.
  async upsertByGoogle(
    googleId: string,
    email: string,
    name?: string,
  ): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.findRecordByEmail(email);
    if (existing !== undefined) {
      const [updated] = await this.database
        .update(user)
        // Google vouches for the address, so signing in through it settles the
        // verification a password account was still waiting on.
        .set({
          googleId,
          name: existing.name ?? name ?? null,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        })
        .where(eq(user.id, existing.id))
        .returning();

      return { user: this.mapper.toUser(updated), isNew: false };
    }

    const [created] = await this.database
      .insert(user)
      .values({ googleId, email, name: name ?? null, emailVerifiedAt: new Date() })
      .returning();

    return { user: this.mapper.toUser(created), isNew: true };
  }

  /** Replaces the password and retires every session already open.
   *
   *  Bumping the counter is what does the retiring: tokens carry the number
   *  they were signed with, so the ones already out there stop matching while
   *  the one signed straight after this matches fine.
   *
   *  Following the link also proves the address, so an account that never
   *  confirmed one arrives confirmed — it is the same proof, asked twice.
   */
  async replacePassword(id: string, passwordHash: string): Promise<UserRecord> {
    const [record] = await this.database
      .update(user)
      .set({
        passwordHash,
        sessionVersion: sql`${user.sessionVersion} + 1`,
        emailVerifiedAt: sql`coalesce(${user.emailVerifiedAt}, now())`,
      })
      .where(eq(user.id, id))
      .returning();

    return record;
  }

  // The whole row rather than the model: the guard needs the session counter,
  // which has no business being a GraphQL field.
  async findRecordById(id: string): Promise<UserRecord | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.id, id));

    return record;
  }

  /** Shuts an account out of the site, or lets it back in. Reversible on
   *  purpose: a judgement nobody dares undo is one nobody dares make. */
  async setBlocked(id: string, blocked: boolean): Promise<void> {
    await this.database
      .update(user)
      .set({ blockedAt: blocked ? new Date() : null })
      .where(eq(user.id, id));
  }

  async findById(id: string): Promise<User | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.id, id));

    return record === undefined ? undefined : this.mapper.toUser(record);
  }
}
