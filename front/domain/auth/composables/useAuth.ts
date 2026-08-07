import type { MeQuery } from '#gql';

export type SignedInUser = MeQuery['me'];

export const useAuth = (): {
  user: Ref<SignedInUser | undefined>;
  isLoading: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
} => {
  // server: false because the session cookie only exists in the browser, and
  // the site is prerendered — asking the API at build time would fail the build.
  // dedupe: 'defer' so several components sharing this key make one request.
  // The API sleeps when nobody uses it and can take the best part of a minute to
  // wake. Without a deadline the page sat on its skeleton for ever; a reader who
  // is not signed in should be told so, not left waiting on a server that may
  // never answer.
  const timeoutMs = 12_000;

  const { data, status, refresh } = useAsyncData(
    'auth-me',
    async (): Promise<SignedInUser | undefined> => {
      const answered = await Promise.race([
        GqlMe().catch((): undefined => undefined),
        new Promise<undefined>((resolve): void => {
          setTimeout((): void => {
            resolve(undefined);
          }, timeoutMs);
        }),
      ]);

      return answered?.me;
    },
    { server: false, dedupe: 'defer' },
  );

  const signOut = async (): Promise<void> => {
    const { execute } = useApi('/auth/logout', { method: 'POST', key: 'auth-logout' });
    await execute();
    await refresh();
  };

  return {
    user: data,
    isLoading: computed((): boolean => status.value === 'pending'),
    refresh: async (): Promise<void> => {
      await refresh();
    },
    signOut,
  };
};
