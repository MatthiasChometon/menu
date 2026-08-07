import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// The app is for two people. It sits on a public URL, so anyone finding it could
// otherwise open an account: the guest list is the only thing standing between
// the sign-in page and the open internet.
@Injectable()
export class EmailAllowlist implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  // Forgetting the guest list on a deployment would silently open the app to
  // whoever finds the URL, and nothing would look wrong. Failing to boot is the
  // only way that mistake gets noticed.
  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') === 'production' && this.isOpen()) {
      throw new Error(
        'ALLOWED_EMAILS is empty. Set the invited addresses, or this app is open to anyone.',
      );
    }
  }

  /** Addresses allowed to hold an account, lowercased. Empty means open to all. */
  private get allowed(): string[] {
    return (this.config.get<string>('ALLOWED_EMAILS') ?? '')
      .split(',')
      .map((email): string => email.trim().toLowerCase())
      .filter((email): boolean => email.length > 0);
  }

  // No list configured means no restriction: a local checkout stays usable
  // without ceremony, and only the deployment sets the guest list.
  isOpen(): boolean {
    return this.allowed.length === 0;
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
