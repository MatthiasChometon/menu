// Whether to offer the reports screen at all. Not a protection — the API
// refuses on its own — only a way to avoid showing a door that would slam.
// `hasFailed` keeps "could not ask" apart from "no": an administrator whose
// request fell over must not be told the screen is not theirs.
export const useAdmin = (): {
  isAdmin: ComputedRef<boolean>;
  hasFailed: ComputedRef<boolean>;
  retry: () => Promise<void>;
} => {
  const { user } = useAuth();

  const { data, error, refresh } = useAsyncData(
    'bug:am-i-admin',
    async (): Promise<boolean> => {
      // Nobody signed in: the question would only answer itself with an error.
      if (user.value === undefined) return false;

      const result = await GqlAmIAdmin();
      return result.amIAdmin;
    },
    // Browser only, and asked again when the session changes — signing in is
    // exactly when the answer stops being "no".
    { server: false, watch: [user] },
  );

  return {
    isAdmin: computed((): boolean => data.value ?? false),
    hasFailed: computed((): boolean => error.value !== undefined),
    retry: refresh,
  };
};
