import { describe, expect, it } from 'vitest';
import { redirectFromState, safeRedirectPath, stateCarrying } from './redirect';

describe('a redirect that survives the Google round trip', () => {
  it('comes back out of the state it was put in', () => {
    const state = stateCarrying('abc123', '/profil?tab=weight#top');

    expect(redirectFromState(state)).toBe('/profil?tab=weight#top');
  });

  it('leaves the state alone when there is nothing to carry', () => {
    expect(stateCarrying('abc123', undefined)).toBe('abc123');
    expect(redirectFromState('abc123')).toBeUndefined();
  });

  it('never puts a path leading off the site into the state', () => {
    expect(stateCarrying('abc123', 'https://evil.example/x')).toBe('abc123');
  });

  it('drops a redirect smuggled into the state by hand', () => {
    const forged = `abc123.${Buffer.from('//evil.example').toString('base64url')}`;

    expect(redirectFromState(forged)).toBeUndefined();
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'profil',
    '/with\nnewline',
    `/${'a'.repeat(700)}`,
    `/${'é'.repeat(400)}`,
    undefined,
    ['/a', '/b'],
  ])('refuses %j', (candidate) => {
    expect(safeRedirectPath(candidate)).toBeUndefined();
  });

  it('keeps the state within what the callback accepts, whatever the path is made of', () => {
    const widest = `/${'é'.repeat(349)}`; // 699 bytes: the most that is accepted

    expect(stateCarrying('a'.repeat(32), widest).length).toBeLessThanOrEqual(1024);
    expect(redirectFromState(stateCarrying('a'.repeat(32), widest))).toBe(widest);
  });

  it('falls back to the plain state for a long non-ASCII path instead of overflowing it', () => {
    expect(stateCarrying('abc123', `/${'é'.repeat(400)}`)).toBe('abc123');
  });

  it('keeps a path of the site, query and all', () => {
    expect(safeRedirectPath('/semaine/2026-11-23?x=1')).toBe('/semaine/2026-11-23?x=1');
  });
});
