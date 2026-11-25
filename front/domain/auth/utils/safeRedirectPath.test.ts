import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirectPath';

describe('the path to come back to after signing in', () => {
  it.each(['/', '/courses-auto', '/recette/12?step=3', '/fr/semaine#lundi'])(
    'keeps the same-site path %s',
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    ['another site', 'https://evil.example/x'],
    ['a protocol-relative URL', '//evil.example/x'],
    ['a backslash trick', '/\\evil.example'],
    ['a script', 'javascript:alert(1)'],
    ['a relative path', 'profil'],
    ['a control character', '/a\nb'],
    ['a tab hidden inside the double slash', '/\t/evil.example'],
    ['a newline hidden inside the double slash', '/\n/evil.example'],
    ['a tab then a backslash', '/\t\\evil.example'],
    ['a leading space', ' /profil'],
    ['an upper-case scheme', 'HTTP://evil.example'],
    ['a data URL', 'data:text/html,x'],
    ['an empty string', ''],
  ])('drops %s', (_name, path) => {
    expect(safeRedirectPath(path)).toBeUndefined();
  });

  // Percent-encoded characters are not decoded by the browser into a different
  // host: they stay a literal path of this very site, which is all that matters.
  it.each(['/%5Cevil.example', '/%2F%2Fevil.example', '/%2F/evil.example', '/../profil'])(
    'keeps %s as a literal same-site path',
    (path) => {
      expect(safeRedirectPath(path)).toBe(path);
    },
  );

  it.each([undefined, null, 42, ['/a']])('drops a non-string (%j)', (value) => {
    expect(safeRedirectPath(value)).toBeUndefined();
  });
});
