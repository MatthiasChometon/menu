import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverBrandTokens, pickBrandTokens } from './buildDynamicLayers';

describe('brand tokens discovery', () => {
  it('resolves the single tokens stylesheet to an absolute path', () => {
    expect(pickBrandTokens(['domain/menu/style/tokens.css'])).toBe(
      resolve('domain/menu/style/tokens.css'),
    );
  });

  it('refuses to pick a brand when none is found', () => {
    expect(() => pickBrandTokens([])).toThrow('brand tokens are missing');
  });

  it('refuses to pick a brand when several compete', () => {
    expect(() =>
      pickBrandTokens(['domain/a/style/tokens.css', 'domain/b/style/tokens.css']),
    ).toThrow('Expected one');
  });

  it('finds the menu slice tokens in the real tree', () => {
    expect(discoverBrandTokens()).toBe(resolve('domain/menu/style/tokens.css'));
  });
});
