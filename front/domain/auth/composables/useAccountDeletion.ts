/** Why the deletion did not happen, in terms the dialog can act on. */
export type DeletionFailure = 'password' | 'unknown';

export const useAccountDeletion = (): {
  password: Ref<string>;
  isBusy: Ref<boolean>;
  failure: Ref<DeletionFailure | undefined>;
  needsPassword: ComputedRef<boolean>;
  remove: () => Promise<boolean>;
} => {
  const { user, refresh } = useAuth();
  const localePath = useLocalePath();

  const password = ref('');
  const isBusy = ref(false);
  const failure = ref<DeletionFailure | undefined>();

  // An account opened through Google has no password to type, so asking for one
  // would be a box nobody could fill.
  const needsPassword = computed((): boolean => user.value?.hasPassword === true);

  const call = useApi('/auth/delete-account', {
    method: 'POST',
    body: computed(() => (needsPassword.value ? { password: password.value } : {})),
    key: 'auth-delete-account',
  });

  // Read structurally rather than through Nuxt's error type: useFetch reports
  // "nothing went wrong" as null in some versions and undefined in others.
  const statusOf = (error: unknown): number | undefined =>
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  return {
    password,
    isBusy,
    failure,
    needsPassword,
    remove: async (): Promise<boolean> => {
      isBusy.value = true;
      failure.value = undefined;

      await call.execute();
      isBusy.value = false;

      if (call.error.value !== null && call.error.value !== undefined) {
        failure.value = statusOf(call.error.value) === 401 ? 'password' : 'unknown';
        return false;
      }

      // The server already cleared the cookie; this drops the copy the app was
      // holding, so the header and the profile stop showing somebody who no
      // longer exists.
      await refresh();
      await navigateTo(localePath('/'));

      return true;
    },
  };
};
