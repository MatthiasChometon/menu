// Where a reader asked to sign in should land once Google sends them back. The
// front names the page they were on in `?redirect=`; it travels inside the
// OAuth `state`, so it survives the round trip without a second cookie and is
// covered by the same check that stops a forged callback.
//
// Only a path of the front itself is ever followed: "//host", "/\host",
// "https://host" or "javascript:" would turn the callback into an open redirect.
//
// The state carries the UTF-8 bytes of the path in base64url (4 characters for
// 3 bytes) after a 32-character nonce and a dot, and the callback refuses a state
// over 1024 characters. 700 bytes give at most 32 + 1 + 934 = 967 characters, so
// a redirect that fits here always fits there; a longer one is dropped (the reader
// lands on the default page), never an error after Google has signed them in.
// Kept in step with front/domain/auth/composables/safeRedirectPath.ts.
export const MAX_REDIRECT_BYTES = 700;

const ORIGIN = 'http://same-origin.invalid';
const SEPARATOR = '.';

export const safeRedirectPath = (candidate: unknown): string | undefined => {
  if (typeof candidate !== 'string' || Buffer.byteLength(candidate, 'utf8') > MAX_REDIRECT_BYTES) {
    return undefined;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return undefined;
  if (
    candidate.includes('\\') ||
    [...candidate].some((character): boolean => character.charCodeAt(0) < 0x20)
  ) {
    return undefined;
  }

  try {
    return new URL(candidate, ORIGIN).origin === ORIGIN ? candidate : undefined;
  } catch {
    return undefined;
  }
};

// `<nonce>` alone, or `<nonce>.<redirect as base64url>`: the nonce is hex, so the
// first dot is always the separator, and base64url never contains one.
export const stateCarrying = (nonce: string, redirect: unknown): string => {
  const safe = safeRedirectPath(redirect);

  return safe === undefined
    ? nonce
    : `${nonce}${SEPARATOR}${Buffer.from(safe, 'utf8').toString('base64url')}`;
};

// Read only from a state that has already been matched against the cookie, and
// validated again regardless: a decoded value is as untrusted as a typed one.
export const redirectFromState = (state: string): string | undefined => {
  const separator = state.indexOf(SEPARATOR);
  if (separator === -1) return undefined;

  return safeRedirectPath(Buffer.from(state.slice(separator + 1), 'base64url').toString('utf8'));
};
