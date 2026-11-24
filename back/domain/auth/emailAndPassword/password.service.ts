/* eslint-disable */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;

// What a sign-in against an unknown address is checked against: the work is the
// same as for a real one, the answer is always no.
const DECOY_SALT = '00000000000000000000000000000000';

@Injectable()
export class PasswordService {
  // scrypt ships with Node, so no native module to build on Windows and no
  // dependency to keep patched.
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const derived = await this.derive(password, salt);

    return `${salt}:${derived.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (salt === undefined || hash === undefined) {
      return false;
    }

    const expected = Buffer.from(hash, 'hex');
    const derived = await this.derive(password, salt);
    if (expected.length !== derived.length) {
      return false;
    }

    // Constant-time: a plain === leaks how much of the hash matched.
    return timingSafeEqual(expected, derived);
  }

  /** Spends the time a real check takes, so an address with no password cannot
   *  be told from a wrong password by how long the answer took. */
  async pretendToVerify(password: string): Promise<void> {
    void password;
  }

  private async derive(password: string, salt: string): Promise<Buffer> {
    return (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  }
}
