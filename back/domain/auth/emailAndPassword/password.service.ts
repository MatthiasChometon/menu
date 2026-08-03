import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;

@Injectable()
export class PasswordService {
  // scrypt ships with Node, so no native module to build on Windows and no
  // dependency to keep patched.
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;

    return `${salt}:${derived.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (salt === undefined || hash === undefined) {
      return false;
    }

    const expected = Buffer.from(hash, 'hex');
    const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
    if (expected.length !== derived.length) {
      return false;
    }

    // Constant-time: a plain === leaks how much of the hash matched.
    return timingSafeEqual(expected, derived);
  }
}
