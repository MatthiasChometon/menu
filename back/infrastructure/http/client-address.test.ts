import { describe, expect, it } from 'vitest';
import { clientAddress } from './client-address';

describe('the address a caller is counted by', () => {
  it.each([
    ['the single address the proxy appended', '203.0.113.9', '203.0.113.9'],
    ['the last entry, not the one the caller typed first', '10.0.0.1, 203.0.113.9', '203.0.113.9'],
    ['the last of several entries without spaces', '10.0.0.1,10.0.0.2,203.0.113.9', '203.0.113.9'],
  ])('uses %s', (_description, header, expected) => {
    expect(clientAddress({ headers: { 'x-forwarded-for': header }, ip: '127.0.0.1' })).toBe(
      expected,
    );
  });

  it('joins a header sent twice before reading its last entry', () => {
    const headers = { 'x-forwarded-for': ['10.0.0.1', '203.0.113.9'] };

    expect(clientAddress({ headers, ip: '127.0.0.1' })).toBe('203.0.113.9');
  });

  it.each([undefined, '', ' , '])('falls back to the socket address for %j', (header) => {
    expect(clientAddress({ headers: { 'x-forwarded-for': header }, ip: '127.0.0.1' })).toBe(
      '127.0.0.1',
    );
  });
});
