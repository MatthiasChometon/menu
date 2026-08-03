export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  // One place decides the base URL and that the session cookie travels with
  // every call.
  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
  });

  return { provide: { api } };
});
