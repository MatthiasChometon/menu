// The one place that knows what an ended session means for the site. The API
// and GraphQL clients only announce it (see infrastructure/api and graphql).
export default defineNuxtPlugin((nuxtApp) => {
  const session = useNuxtData('auth-me');
  const localePath = useLocalePath();
  const router = useRouter();

  const expire = createSessionExpiry({
    hasSession: (): boolean => session.data.value !== undefined && session.data.value !== null,
    clearSession: async (): Promise<void> => {
      await nuxtApp.runWithContext((): void => clearNuxtData('auth-me'));
    },
    signInPath: (): string => localePath('/profil'),
    currentPath: (): string => router.currentRoute.value.fullPath,
    navigate: async (target): Promise<void> => {
      await nuxtApp.runWithContext(() => navigateTo(target));
    },
  });

  nuxtApp.hook('session:expired', expire);
});
