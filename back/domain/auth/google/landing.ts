// Where a sign-in lands. The profile rather than the week: until it is answered
// the site shows every recipe as it was written, in nobody's quantities, which
// is the one thing it exists to work out. Someone arriving for the first time
// should be looking at that form, not hunting for it.
const PROFILE_PATH = '/profil';

export const landingUrl = (frontUrl: string): string =>
  // A configured address is as likely to end in a slash as not, and the double
  // slash it would otherwise make is not the same URL.
  `${frontUrl.replace(/\/+$/, '')}${PROFILE_PATH}`;
