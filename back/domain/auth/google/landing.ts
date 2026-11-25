// Where a sign-in lands. Somebody arriving for the first time goes to the
// profile: until it is answered the site shows every recipe as it was written,
// in nobody's quantities, which is the one thing it exists to work out. They
// should be looking at that form, not hunting for it.
//
// Everyone after that goes to the week, because that is what they came back
// for. Sending a returning reader to a form they filled months ago is asking
// them to dismiss it every single time.
const PROFILE_PATH = '/profil';

// The front address arrives without a trailing slash (see front-url.ts).
export const landingUrl = (front: string, isFirstSignIn: boolean): string =>
  isFirstSignIn ? `${front}${PROFILE_PATH}` : front;
