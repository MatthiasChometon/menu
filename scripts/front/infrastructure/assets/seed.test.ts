import { describe, expect, it } from 'vitest';
import { fingerprint } from './seed.ts';

describe('fingerprint', () => {
  it('is the first 8 hex chars of the sha256 (parity with Python)', () => {
    // sha256("test") = 9f86d081884c7d65...
    expect(fingerprint(Buffer.from('test'))).toBe('9f86d081');
  });

  it('changes when the bytes change, so an edited photo gets a new name', () => {
    expect(fingerprint(Buffer.from('a'))).not.toBe(fingerprint(Buffer.from('b')));
  });
});
