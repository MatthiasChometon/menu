const ORIGIN = 'http://same-origin.invalid';

// A path the reader can be sent back to after signing in, or nothing. Only a
// path of this very site qualifies: "//host/x", "/\host", "https://host/x" or
// "javascript:..." would turn the sign-in page into an open redirect.
export const safeRedirectPath = (candidate: unknown): string | undefined => {
  if (typeof candidate !== 'string') return undefined;
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
