import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape';

describe('escapeHtml', () => {
  it('escapes the four characters that can open a tag or an attribute', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });

  it('escapes an ampersand once, not twice', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});
