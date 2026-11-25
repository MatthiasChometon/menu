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
    ['an empty string', ''],
  ])('drops %s', (_name, path) => {
    expect(safeRedirectPath(path)).toBeUndefined();
  });

  it.each([undefined, null, 42, ['/a']])('drops a non-string (%j)', (value) => {
    expect(safeRedirectPath(value)).toBeUndefined();
  });
});
