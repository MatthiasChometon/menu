export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
