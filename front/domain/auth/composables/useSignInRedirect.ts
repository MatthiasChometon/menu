// A reader sent to sign in because their session ended comes back to the page
// they were on, once signed in. Only a same-site path is followed.
export const useSignInRedirect = (): void => {
  const route = useRoute();
  const { user } = useAuth();

  watch(user, async (signedIn): Promise<void> => {
    const back = safeRedirectPath(route.query.redirect);
    if (signedIn !== undefined && signedIn !== null && back !== undefined) {
      await navigateTo(back);
    }
  });
};
