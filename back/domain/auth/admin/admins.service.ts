import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Who may read the reports. Kept in the environment rather than in the database
// on purpose: a right that cannot be granted through the site cannot be taken
// through the site either, and there is no screen to build for it.
//
// Unset means NOBODY is an administrator. That is the opposite of the guest
// list, where empty means everyone — and it is the safe reading in both cases:
// forgetting this variable closes a door rather than opening one.
@Injectable()
export class Admins {
  constructor(private readonly config: ConfigService) {}

  private get emails(): string[] {
    return (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email): string => email.trim().toLowerCase())
      .filter((email): boolean => email.length > 0);
  }

  has(email: string): boolean {
    return this.emails.includes(email.trim().toLowerCase());
  }

  /** Where a new report is announced. Empty when nobody is listed, and the
   *  report is then simply kept rather than sent nowhere. */
  get recipients(): string[] {
    return this.emails;
  }
}
