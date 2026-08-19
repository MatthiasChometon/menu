/** What went wrong, in terms the interface can act on rather than status codes
 *  scattered through templates. `unverified` is the one worth telling apart:
 *  it is the only failure the reader can fix from here, with a new link. */
export type AuthFailure = 'credentials' | 'taken' | 'unverified' | 'unknown';

export const useEmailAuth = (): {
  credentials: { email: string; password: string };
  isBusy: Ref<boolean>;
  failure: Ref<AuthFailure | undefined>;
  register: () => Promise<'sent' | undefined>;
  requestReset: () => Promise<'sent' | undefined>;
  signIn: () => Promise<'signed-in' | undefined>;
  resendLink: () => Promise<void>;
} => {
  const { locale } = useNuxtApp().$i18n;
  const { refresh } = useAuth();

  const credentials = reactive({ email: '', password: '' });
  const isBusy = ref(false);
  const failure = ref<AuthFailure | undefined>();

  // The account is opened in the language the form was in, because the message
  // that follows is sent from a request carrying nothing but an address.
  const registration = computed(() => ({ ...credentials, locale: locale.value }));

  const registerCall = useApi('/auth/register', {
    method: 'POST',
    body: registration,
    key: 'auth-register',
  });
  const signInCall = useApi('/auth/login', {
    method: 'POST',
    body: credentials,
    key: 'auth-login',
  });
  const forgotCall = useApi('/auth/forgot-password', {
    method: 'POST',
    body: computed(() => ({ email: credentials.email })),
    key: 'auth-forgot-password',
  });
  const resendCall = useApi('/auth/resend-verification', {
    method: 'POST',
    body: computed(() => ({ email: credentials.email })),
    key: 'auth-resend',
  });

  const failureFrom = (status: number | undefined): AuthFailure => {
    if (status === 409) return 'taken';
    if (status === 403) return 'unverified';
    if (status === 401) return 'credentials';

    return 'unknown';
  };

  // Read structurally rather than through Nuxt's error type: useFetch reports
  // "nothing went wrong" as null in some versions and undefined in others, and
  // a composable that only handles one of them fails silently on the other.
  const statusOf = (error: unknown): number | undefined =>
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined;

  const run = async <T>(
    call: { execute: () => Promise<unknown>; error: { value: unknown } },
    onSuccess: T,
  ): Promise<T | undefined> => {
    isBusy.value = true;
    failure.value = undefined;
    await call.execute();
    isBusy.value = false;

    const raised = call.error.value;
    if (raised === null || raised === undefined) return onSuccess;

    failure.value = failureFrom(statusOf(raised));
    return undefined;
  };

  return {
    credentials,
    isBusy,
    failure,
    // No session comes back: the account is not usable until the link is
    // followed, so the interface has to say so rather than pretend otherwise.
    register: (): Promise<'sent' | undefined> => run(registerCall, 'sent'),
    // Says a link is on its way whether or not there was anyone to send it to:
    // the API answers the same either way, and so must the interface, or the
    // screen becomes the way to find out who has an account here.
    requestReset: (): Promise<'sent' | undefined> => run(forgotCall, 'sent'),
    signIn: async (): Promise<'signed-in' | undefined> => {
      const outcome = await run(signInCall, 'signed-in' as const);
      if (outcome !== undefined) await refresh();

      return outcome;
    },
    // Always succeeds as far as the reader can tell — the API answers the same
    // whether or not the address has an account waiting.
    resendLink: async (): Promise<void> => {
      await run(resendCall, true);
    },
  };
};
