import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Spelt out, because "anyone may sign up" and "somebody forgot the guest list"
// look identical at runtime and only one of them is a decision. The star is the
// decision; an empty variable stays a boot failure.
const OPEN_TO_ALL = '*';

// The app sits on a public URL, so the guest list is the only thing standing
// between the sign-in page and the open internet. It holds the invited
// addresses, or the star when the door is meant to be open to everyone.
@Injectable()
export class EmailAllowlist implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  // Forgetting the guest list on a deployment would silently open the app to
  // whoever finds the URL, and nothing would look wrong. Failing to boot is the
  // only way that mistake gets noticed — which is why opening the app on
  // purpose has to be written down rather than left blank.
  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') === 'production' && this.isUnset()) {
      throw new Error(
        `ALLOWED_EMAILS is empty. Set the invited addresses, or "${OPEN_TO_ALL}" to invite anyone.`,
      );
    }
  }

  private get configured(): string {
    return (this.config.get<string>('ALLOWED_EMAILS') ?? '').trim();
  }

  /** Addresses allowed to hold an account, lowercased. */
  private get allowed(): string[] {
    if (this.invitesAnyone()) return [];

    return this.configured
      .split(',')
      .map((email): string => email.trim().toLowerCase())
      .filter((email): boolean => email.length > 0);
  }

  /** Whether the configuration deliberately invites everyone. */
  invitesAnyone(): boolean {
    return this.configured === OPEN_TO_ALL;
  }

  // Nothing configured at all. Fine in a local checkout, which stays usable
  // without ceremony; a deployment has to say which of the two it means.
  private isUnset(): boolean {
    return !this.invitesAnyone() && this.allowed.length === 0;
  }

  isOpen(): boolean {
    return this.invitesAnyone() || this.isUnset();
  }

  allows(email: string): boolean {
    return this.isOpen() || this.allowed.includes(email.trim().toLowerCase());
  }

  // Deliberately says the address is not invited rather than that it is unknown:
  // there is nothing to enumerate here, the list is two people long.
  assertAllowed(email: string): void {
    if (!this.allows(email)) {
      throw new ForbiddenException('This email address is not invited to this app.');
    }
  }
}
