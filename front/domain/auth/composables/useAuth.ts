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
  const { data, status, refresh } = useAsyncData(
    'auth-me',
    async (): Promise<SignedInUser | undefined> => {
      const result = await GqlMe().catch((): undefined => undefined);
      return result?.me;
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
