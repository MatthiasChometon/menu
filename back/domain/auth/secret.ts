import { ConfigService } from '@nestjs/config';
import { underPassenger } from '../../infrastructure/config/runtime';

const MIN_SECRET_LENGTH = 32;

// Values that ship in the example file or read like a placeholder. Any of them
// on the deployed server means every session token can be forged by anyone who has read
// the repository.
const KNOWN_WEAK = ['dev-secret-change-me', 'secret', 'changeme', 'change-me'];

// Read once, at boot, and loudly: a signing key that is wrong is not something
// to discover from a security report months later.
export const sessionSecret = (config: ConfigService): string => {
  const secret = config.getOrThrow<string>('JWT_SECRET');
  if (!underPassenger()) return secret;

  if (KNOWN_WEAK.includes(secret.toLowerCase())) {
    throw new Error('JWT_SECRET is still the example value. Generate a real one before deploying.');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production.`);
  }

  return secret;
};
