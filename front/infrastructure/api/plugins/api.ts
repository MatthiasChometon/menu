declare module '#app' {
  // An interface because declaration merging is how Nuxt types its hooks.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface RuntimeNuxtHooks {
    // Raised by the API and GraphQL clients when the server says the session
    // ended. Whoever owns the session decides what that means for the page.
    'session:expired': () => void | Promise<void>;
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const { reportError } = useErrorReporting();

  const interceptors = createApiInterceptors({
    report: reportError,
    expireSession: (): void => announceSessionExpiry(nuxtApp, reportError),
  });

  // One place decides the base URL, that the session cookie travels with every
  // call, and what happens when a call fails.
  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    ...interceptors,
  });

  return { provide: { api } };
});
