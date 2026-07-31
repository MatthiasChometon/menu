import { componentsList, cssList, layerConfigTsGlobList, layerList, typesDirList } from './ddd';

export default defineNuxtConfig({
  extends: layerList,
  compatibilityDate: '2026-07-31',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  devServer: { port: Number(process.env.PORT) || 3777 },
  srcDir: '.',
  pages: true,
  ignore: ['**/*.test.ts'],
  modules: ['@nuxt/eslint', '@vueuse/nuxt', '@vite-pwa/nuxt'],
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
