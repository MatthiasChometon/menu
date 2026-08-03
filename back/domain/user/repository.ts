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

  async findById(id: string): Promise<User | undefined> {
    const [record] = await this.database.select().from(user).where(eq(user.id, id));

    return record === undefined ? undefined : this.mapper.toUser(record);
  }
}
