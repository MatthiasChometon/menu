// Whether to offer the reports screen at all. Not a protection — the API
// refuses on its own — only a way to avoid showing a door that would slam.
export const useAdmin = (): { isAdmin: ComputedRef<boolean> } => {
  const { user } = useAuth();

  const { data } = useAsyncData(
    'bug:am-i-admin',
    async (): Promise<boolean> => {
      // Nobody signed in: the question would only answer itself with an error.
      if (user.value === undefined) return false;

      const result = await GqlAmIAdmin().catch((): undefined => undefined);
      return result?.amIAdmin ?? false;
    },
    // Browser only, and asked again when the session changes — signing in is
    // exactly when the answer stops being "no".
    { server: false, watch: [user] },
  );

  return { isAdmin: computed((): boolean => data.value ?? false) };
};
