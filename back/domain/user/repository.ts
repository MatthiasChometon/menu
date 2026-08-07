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

  async create(email: string, passwordHash: string, name?: string): Promise<User> {
    const [record] = await this.database
      .insert(user)
      .values({ email, passwordHash, name: name ?? null })
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
        .set({ googleId, name: existing.name ?? name ?? null })
        .where(eq(user.id, existing.id))
        .returning();

      return { user: this.mapper.toUser(updated), isNew: false };
    }

    const [created] = await this.database
      .insert(user)
      .values({ googleId, email, name: name ?? null })
      .returning();

    return { user: this.mapper.toUser(created), isNew: true };
  }

  async findById(id: string): Promise<User | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.id, id));

    return record === undefined ? undefined : this.mapper.toUser(record);
  }
}
