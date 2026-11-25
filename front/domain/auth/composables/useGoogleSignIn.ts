// Where the "Continue with Google" button sends the browser. The page the reader
// was sent from (`?redirect=`) is handed to the API, which carries it through
// Google and back: without it, a session that ended on page X lands on the home
// page after signing in with Google, while the email form returns to X.
//
// Undefined when no API is configured: the button would otherwise point at
// whichever host the setting happens to hold, and a guessed hostname belongs to
// whoever claimed it first.
export const useGoogleSignIn = (): { googleSignInUrl: ComputedRef<string | undefined> } => {
  const route = useRoute();
  const config = useRuntimeConfig();

  const googleSignInUrl = computed((): string | undefined => {
    const apiBase = config.public.apiBase.trim();
    if (apiBase.length === 0) return undefined;

    const back = safeRedirectPath(route.query.redirect);
    const query = back === undefined ? '' : `?redirect=${encodeURIComponent(back)}`;

    return `${apiBase}/auth/google${query}`;
  });

  return { googleSignInUrl };
};
