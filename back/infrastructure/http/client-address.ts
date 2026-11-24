type RequestWithAddress = { headers?: Record<string, unknown>; ip?: string };

// The last entry is the one our own proxy appended: it is the address that
// proxy saw connecting. Every entry to its left is whatever the caller typed.
const lastForwardedAddress = (header: unknown): string | undefined => {
  const value: unknown = Array.isArray(header) ? header.join(',') : header;
  if (typeof value !== 'string') return undefined;

  return value
    .split(',')
    .map((address): string => address.trim())
    .filter((address): boolean => address !== '')
    .at(-1);
};

// What the rate limiter counts a caller by. The API sits behind the host's
// proxy, so the socket address is always the proxy's and counting by it would
// throttle every user at once; the leftmost forwarded address is the caller's
// own claim, and rotating it would hand out a fresh bucket per request.
export const clientAddress = (request: RequestWithAddress): string =>
  lastForwardedAddress(request.headers?.['x-forwarded-for']) ?? request.ip ?? 'unknown';
