export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // The REST side of the API: signing in and out, which GraphQL cannot do
      // because a resolver has no way to set a cookie.
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3779',
    },
  },
});
