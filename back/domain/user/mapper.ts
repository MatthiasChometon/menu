import { Injectable } from '@nestjs/common';
import { User } from './model';
import { UserRecord } from './type';

@Injectable()
export class UserMapper {
  // REST replies serialise whatever object they are handed, unlike GraphQL
  // which only exposes decorated fields. Going through this mapper is what
  // stops the password hash from ever reaching a response body.
  toUser(record: UserRecord): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      hasPassword: record.passwordHash !== null,
    };
  }
}
