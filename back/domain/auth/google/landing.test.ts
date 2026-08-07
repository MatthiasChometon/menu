import { describe, expect, it } from 'vitest';
import { landingUrl } from './landing';

describe('where a sign-in lands', () => {
  it('sends the reader to the profile, not the front page', () => {
    expect(landingUrl('https://menu-semaine-887.netlify.app')).toBe(
      'https://menu-semaine-887.netlify.app/profil',
    );
  });

  it('does not double the slash when the address already ends in one', () => {
    // Both spellings are ordinary things to put in a configuration, and the two
    // slashes they would otherwise make are not the same URL.
    expect(landingUrl('https://menu-semaine-887.netlify.app/')).toBe(
      'https://menu-semaine-887.netlify.app/profil',
    );
    expect(landingUrl('http://localhost:3777//')).toBe('http://localhost:3777/profil');
  });
});
