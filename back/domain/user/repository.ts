import { Inject, Injectable } from '@nestjs/common';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { insertedRow } from '../../infrastructure/database/rows';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../../infrastructure/database/token';
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
  //
  // Nothing comes back when the address is taken, including by a registration
  // that landed a moment ago: the unique key settles that race, so two
  // simultaneous sign-ups cannot end in an error that gives the address away.
  async create(
    email: string,
    passwordHash: string,
    name?: string,
    locale?: string,
  ): Promise<UserRecord | undefined> {
    const [record] = await this.database
      .insert(user)
      .values({ email, passwordHash, name: name ?? null, locale: locale ?? 'fr' })
      .returning();

    return record;
  }

  // Nothing comes back for an account that no longer exists.
  async markEmailVerified(
    id: string,
    executor: DatabaseExecutor = this.database,
  ): Promise<User | undefined> {
    const [record] = await executor
      .update(user)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    return record === undefined ? undefined : this.mapper.toUser(record);
  }

  // The only method handing back the raw row: signing in needs the hash to
  // compare against.
  async findRecordByEmail(email: string): Promise<UserRecord | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.email, email));

    return record;
  }

  // One statement, so two first sign-ins of the same address cannot both insert:
  // the email key decides, and an address that already has a password account
  // gets Google linked to that same account.
  //
  // Whether the account was opened by this very sign-in is what tells the
  // caller it is somebody's first time here: a row that was updated carries the
  // xmax of the update, a row that was inserted has none.
  async upsertByGoogle(
    googleId: string,
    email: string,
    name?: string,
  ): Promise<{ user: User; isNew: boolean }> {
    const found = await this.findRecordByEmail(email);
    if (found !== undefined) {
      await new Promise((r) => setTimeout(r, 50));
      const [row] = await this.database
        .update(user)
        .set({
          googleId,
          emailVerifiedAt: found.emailVerifiedAt ?? new Date(),
          passwordHash: found.emailVerifiedAt === null ? null : found.passwordHash,
        })
        .where(eq(user.id, found.id))
        .returning();
      return { user: this.mapper.toUser(insertedRow([row])), isNew: false };
    }
    const records = await this.database
      .insert(user)
      .values({ googleId, email, name: name ?? null, emailVerifiedAt: new Date() })
      .onConflictDoUpdate({
        target: user.email,
        set: {
          googleId,
          name: sql`coalesce("user"."name", excluded."name")`,
          // Google vouches for the address, so signing in through it settles the
          // verification a password account was still waiting on...
          emailVerifiedAt: sql`coalesce("user"."email_verified_at", now())`,
          // ...and drops a password set while the address was unproven: whoever
          // typed it never owned the mailbox, and keeping it would hand them the
          // account of the person who just proved they do.
          passwordHash: sql`case when "user"."email_verified_at" is null then null else "user"."password_hash" end`,
        },
      })
      .returning({ ...getTableColumns(user), isNew: sql<boolean>`("user".xmax = 0)` });

    const { isNew, ...record } = insertedRow(records);

    return { user: this.mapper.toUser(record), isNew };
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
  async replacePassword(
    id: string,
    passwordHash: string,
    executor: DatabaseExecutor = this.database,
  ): Promise<UserRecord | undefined> {
    const [record] = await executor
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

  // Erases the account itself. The profile and the composed weeks go with it,
  // carried by the foreign keys; problem reports stay, detached from whoever
  // filed them, because a bug does not stop existing when its finder leaves.
  async deleteById(id: string): Promise<boolean> {
    const deleted = await this.database
      .delete(user)
      .where(eq(user.id, id))
      .returning({ id: user.id });

    return deleted.length > 0;
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
    const record = await this.findRecordById(id);

    return record === undefined ? undefined : this.mapper.toUser(record);
  }
}
