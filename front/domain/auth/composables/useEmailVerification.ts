export type VerificationOutcome = 'signed-in' | 'expired' | 'missing' | 'unavailable';

/** Spends the link from the message and signs the reader in. A link that does
 *  not work is one answer, because the API deliberately refuses to say whether
 *  a token is unknown, used or out of date. A server that could not be reached
 *  (or answered with an error of its own) is another: the link may still be
 *  good, and telling the reader it is dead would send them for a new one. */
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
      const raised: unknown = call.error.value;
      if (raised !== undefined) {
        return isTransientFailure(raised) ? 'unavailable' : 'expired';
      }

      await refresh();
      return 'signed-in';
    },
  };
};
