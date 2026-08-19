export type ResetOutcome = 'signed-in' | 'expired' | 'missing' | 'refused';

/** Sets a new password from the link in the message, and signs the reader in.
 *  Unknown, spent and expired links all come back as one answer, because the
 *  API deliberately refuses to tell them apart. */
export const usePasswordReset = (): {
  password: Ref<string>;
  isBusy: Ref<boolean>;
  submit: (token: string | undefined) => Promise<ResetOutcome>;
} => {
  const { refresh } = useAuth();

  const password = ref('');
  const token = ref('');
  const isBusy = ref(false);

  const call = useApi('/auth/reset-password', {
    method: 'POST',
    body: computed(() => ({ token: token.value, password: password.value })),
    key: 'auth-reset-password',
  });

  return {
    password,
    isBusy,
    submit: async (candidate: string | undefined): Promise<ResetOutcome> => {
      if (candidate === undefined || candidate.length === 0) return 'missing';

      token.value = candidate;
      isBusy.value = true;
      await call.execute();
      isBusy.value = false;

      // null in some Nuxt versions, undefined in others: treating only one as
      // success would leave the reader stuck on a page that worked.
      const raised: unknown = call.error.value;
      if (raised === null || raised === undefined) {
        await refresh();
        return 'signed-in';
      }

      // 400 is the password the server would not take — too short. Anything
      // else means the link itself is done for, and a new one is needed.
      const status =
        typeof raised === 'object' && raised !== null && 'statusCode' in raised
          ? (raised as { statusCode?: number }).statusCode
          : undefined;

      return status === 400 ? 'refused' : 'expired';
    },
  };
};
