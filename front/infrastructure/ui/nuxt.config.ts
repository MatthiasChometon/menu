export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  // @nuxt/fonts ships with Nuxt UI. Declaring the families (with the weights the
  // design uses) has it download them at build and serve them same-origin —
  // readable offline in a shop, and allowed by the site's own CSP.
  fonts: {
    families: [
      {
        name: 'Instrument Sans',
        provider: 'google',
        weights: [400, 500, 600, 700],
        styles: ['normal', 'italic'],
      },
      {
        name: 'Instrument Serif',
        provider: 'google',
        weights: [400],
        styles: ['normal', 'italic'],
      },
    ],
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#235030' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },
});
