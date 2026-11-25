import type { NuxtApp } from '#app';

// Tells whoever owns the session (a domain plugin listening to the hook) that
// the server ended it. A listener that fails is reported, never thrown back at
// the call that happened to discover the expiry.
export const announceSessionExpiry = (
  nuxtApp: NuxtApp,
  report: (context: string, error: unknown) => void,
): void => {
  Promise.resolve(nuxtApp.callHook('session:expired')).catch((error: unknown): void =>
    report('session:expired', error),
  );
};
