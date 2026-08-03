import { componentsList, cssList, layerConfigTsGlobList, layerList, typesDirList } from './ddd';

export default defineNuxtConfig({
  extends: layerList,
  compatibilityDate: '2026-07-31',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  devServer: { port: Number(process.env.PORT) || 3777 },
  srcDir: '.',
  pages: true,
  ignore: ['**/*.test.ts', '**/*visual.test.ts', '**/*e2e.test.ts'],
  // The PWA module registers a virtual module that Vitest cannot resolve, and a
  // service worker is meaningless in a component test anyway.
  modules: ['@nuxt/eslint', '@vueuse/nuxt', ...(process.env.VITEST ? [] : ['@vite-pwa/nuxt'])],
  icon: {
    // Most icons are named in composables (the nav entries, the profile
    // choices) rather than written in a template, so the default template-only
    // detection misses them: they were left out of the bundle and every render
    // tried to fetch them from the Iconify API instead.
    clientBundle: { scan: true },
  },
  css: cssList,
  components: componentsList,
  imports: { dirs: typesDirList },
  // The whole app is static: menus change once a week, when the skill writes a
  // new JSON and regenerates. Prerendering everything is what makes it readable
  // offline in a supermarket aisle.
  nitro: { prerender: { crawlLinks: true, routes: ['/'], failOnError: true } },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Menu de la semaine',
      short_name: 'Menu',
      description: 'Recettes, apports et liste de courses de la semaine',
      lang: 'fr',
      theme_color: '#65a30d',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      // Everything is prerendered, so the whole app can be precached: the
      // shopping list stays readable with no signal in the shop.
      globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2,json}'],
      navigateFallback: '/',
    },
    client: { installPrompt: true },
  },
  typescript: {
    strict: true,
    typeCheck: 'build',
    tsConfig: { exclude: layerConfigTsGlobList, compilerOptions: { incremental: true } },
    nodeTsConfig: { include: layerConfigTsGlobList, compilerOptions: { incremental: true } },
  },
});
