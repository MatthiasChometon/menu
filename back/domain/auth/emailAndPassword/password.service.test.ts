import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

const service = new PasswordService();

describe('PasswordService', () => {
  it('accepts the password it hashed', async () => {
    const stored = await service.hash('correct horse battery staple');

    await expect(service.verify('correct horse battery staple', stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await service.hash('correct horse battery staple');

    await expect(service.verify('Correct horse battery staple', stored)).resolves.toBe(false);
  });

  it('salts each hash, so the same password never stores the same string', async () => {
    const first = await service.hash('same password');
    const second = await service.hash('same password');

    expect(first).not.toBe(second);
  });

  it('rejects a malformed stored value instead of throwing', async () => {
    // A truncated or hand-edited row must fail the sign-in, not crash it.
    await expect(service.verify('whatever', 'not-a-real-hash')).resolves.toBe(false);
  });
});
