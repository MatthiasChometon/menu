const ORIGIN = 'http://same-origin.invalid';

// The API carries the path in the OAuth state, which it caps at 700 UTF-8 bytes
// (back/domain/auth/google/redirect.ts, the same rule): a longer path is dropped
// here so the button never sends what the API would only ignore.
const MAX_REDIRECT_BYTES = 700;

// A path the reader can be sent back to after signing in, or nothing. Only a
// path of this very site qualifies: "//host/x", "/\host", "https://host/x" or
// "javascript:..." would turn the sign-in page into an open redirect.
export const safeRedirectPath = (candidate: unknown): string | undefined => {
  if (typeof candidate !== 'string') return undefined;
  if (new TextEncoder().encode(candidate).length > MAX_REDIRECT_BYTES) return undefined;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return undefined;
  if (
    candidate.includes('\\') ||
    [...candidate].some((character): boolean => character.charCodeAt(0) < 0x20)
  )
    return undefined;

  try {
    return new URL(candidate, ORIGIN).origin === ORIGIN ? candidate : undefined;
  } catch {
    return undefined;
  }
};
