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
});
