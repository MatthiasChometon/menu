import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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

  async findById(id: string): Promise<User | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.id, id));

    return record === undefined ? undefined : this.mapper.toUser(record);
  }
}
