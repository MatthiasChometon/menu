import { safeRedirectPath } from './safeRedirectPath';

export type SessionExpiryContext = {
  /** Whether somebody was signed in on this page until now. */
  hasSession: () => boolean;
  /** Forgets the signed-in user, so every screen shows the signed-out state. */
  clearSession: () => void | Promise<void>;
  /** The localized sign-in page. */
  signInPath: () => string;
  /** Where the reader is. */
  currentPath: () => string;
  navigate: (target: string | { path: string; query: { redirect: string } }) => Promise<unknown>;
};

const withoutTrailingSlash = (path: string): string =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

// What the site does when the server says the session ended: forget the user
// and send them to sign in, bringing them back to where they were. A 401 for
// somebody who was never signed in, or a second one while already leaving,
// changes nothing.
export const createSessionExpiry = (context: SessionExpiryContext): (() => Promise<void>) => {
  let isLeaving = false;

  return async (): Promise<void> => {
    if (isLeaving || !context.hasSession()) return;
    isLeaving = true;

    try {
      await context.clearSession();

      const here = context.currentPath();
      if (
        withoutTrailingSlash(here.split(/[?#]/)[0] ?? '') ===
        withoutTrailingSlash(context.signInPath())
      )
        return;

      const redirect = safeRedirectPath(here);
      await context.navigate(
        redirect === undefined
          ? context.signInPath()
          : { path: context.signInPath(), query: { redirect } },
      );
    } finally {
      isLeaving = false;
    }
  };
};
