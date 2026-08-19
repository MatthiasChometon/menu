export type VerificationOutcome = 'signed-in' | 'expired' | 'missing';

/** Spends the link from the message and signs the reader in. Everything that
 *  can go wrong here is one of three answers, because the API deliberately
 *  refuses to say whether a token is unknown, used or out of date. */
export const useEmailVerification = (): {
  verify: (token: string | undefined) => Promise<VerificationOutcome>;
} => {
  const { refresh } = useAuth();
  const token = ref<string>('');

  const call = useApi('/auth/verify-email', {
    method: 'POST',
    body: computed(() => ({ token: token.value })),
    key: 'auth-verify-email',
  });

  return {
    verify: async (candidate: string | undefined): Promise<VerificationOutcome> => {
      if (candidate === undefined || candidate.length === 0) return 'missing';

      token.value = candidate;
      await call.execute();
      // null in some Nuxt versions, undefined in others: treating only one as
      // success would sign nobody in on the other.
      const raised: unknown = call.error.value;
      if (raised !== null && raised !== undefined) return 'expired';

      await refresh();
      return 'signed-in';
    },
  };
};
