import { describe, expect, it } from 'vitest';
import { isAwaitCarrefour, isExtensionHere, isPair, isPaired, isWhereIsExtension } from './bridge';

describe('bridge message guards', () => {
  it('accepts a well-formed pair message and reads its fields', () => {
    const data: unknown = { type: 'menu:pair', endpoint: 'https://api', token: 'abc' };

    expect(isPair(data)).toBe(true);
  });

  it('rejects a pair message missing its token', () => {
    expect(isPair({ type: 'menu:pair', endpoint: 'https://api' })).toBe(false);
  });

  it('rejects a foreign message and non-objects', () => {
    expect(isPair({ type: 'other' })).toBe(false);
    expect(isPair(null)).toBe(false);
    expect(isPair('menu:pair')).toBe(false);
  });

  it('narrows extension-here only with a boolean configured flag', () => {
    expect(isExtensionHere({ type: 'menu:extension-here', configured: true })).toBe(true);
    expect(isExtensionHere({ type: 'menu:extension-here' })).toBe(false);
  });

  it('recognises the remaining message kinds', () => {
    expect(isPaired({ type: 'menu:paired' })).toBe(true);
    expect(isWhereIsExtension({ type: 'menu:where-is-extension' })).toBe(true);
    expect(isAwaitCarrefour({ type: 'menu:await-carrefour', returnUrl: '/x' })).toBe(true);
    expect(isAwaitCarrefour({ type: 'menu:await-carrefour' })).toBe(false);
  });
});
