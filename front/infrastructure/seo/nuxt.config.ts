export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // The site's own address, needed absolute: a preview card is built by a
      // server that fetched the page from somewhere else, so a relative image
      // path resolves against nothing it can reach.
      siteUrl: process.env.NUXT_PUBLIC_I18N_BASE_URL ?? 'http://localhost:3777',
    },
  },
});
