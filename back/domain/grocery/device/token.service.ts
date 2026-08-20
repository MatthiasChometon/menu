import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceTokenService {
  issue(): string {
    return randomBytes(32).toString('base64url');
  }

  // Only the digest is kept, so a dump of the table hands nobody a working
  // token. Lookups go through the unique index on the digest, which is why no
  // constant-time comparison is needed here.
  fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
