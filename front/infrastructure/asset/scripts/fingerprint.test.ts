import { describe, expect, it } from 'vitest';
import { fingerprint } from './fingerprint';

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('fingerprint', () => {
  it('is the first 8 hex chars of the sha256', async () => {
    // sha256("test") = 9f86d081884c7d65...
    expect(await fingerprint(bytesOf('test'))).toBe('9f86d081');
  });

  it('changes when the bytes change, so an edited photo gets a new name', async () => {
    expect(await fingerprint(bytesOf('a'))).not.toBe(await fingerprint(bytesOf('b')));
  });
});
