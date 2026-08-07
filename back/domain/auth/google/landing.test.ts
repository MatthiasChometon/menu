import { describe, expect, it } from 'vitest';
import { landingUrl } from './landing';

const FRONT = 'https://menu-semaine-887.netlify.app';

describe('where a sign-in lands', () => {
  it('sends someone arriving for the first time to the profile', () => {
    expect(landingUrl(FRONT, true)).toBe(`${FRONT}/profil`);
  });

  it('sends everyone after that to the week they came back for', () => {
    // A reader who filled the form months ago should not have to dismiss it on
    // every sign-in.
    expect(landingUrl(FRONT, false)).toBe(FRONT);
  });

  it('does not double the slash when the address already ends in one', () => {
    // Both spellings are ordinary things to put in a configuration, and the two
    // slashes they would otherwise make are not the same URL.
    expect(landingUrl(`${FRONT}/`, true)).toBe(`${FRONT}/profil`);
    expect(landingUrl('http://localhost:3777//', true)).toBe('http://localhost:3777/profil');
    expect(landingUrl(`${FRONT}/`, false)).toBe(FRONT);
  });
});
