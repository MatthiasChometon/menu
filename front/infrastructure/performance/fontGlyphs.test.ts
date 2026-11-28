import { describe, expect, it } from 'vitest';
import { glyphsOf } from './fontGlyphs';

describe('the glyphs a site displays', () => {
  it('keeps each Latin character once, accents and typographic marks included', () => {
    expect(glyphsOf(['été œuf', 'été ’ €'])).toBe(' ’€uftéœ'.split('').sort().join(''));
  });

  it('leaves out what the Latin font does not cover', () => {
    expect(glyphsOf(['a 中 😀'])).toBe(' a');
  });
});
