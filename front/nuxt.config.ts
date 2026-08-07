import {
  componentsList,
  cssList,
  layerConfigTsGlobList,
  layerList,
  recipeRouteList,
  typesDirList,
} from './ddd';

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
    // choices) rather than written in a template, and the scan only reads
    // templates by default — those icons were left out of the bundle and the app
    // fetched them from the Iconify API at runtime, which the site's own
    // Content-Security-Policy now forbids. Scanning TypeScript too is what keeps
    // an icon named in a composable from silently disappearing.
    clientBundle: {
      scan: {
        // .vue is the default; .ts catches the icons named in composables, and
        // .json the ones the content declares for every food and seasoning.
        // Anything missed here is fetched from the Iconify API at runtime, which
        // the site's own Content-Security-Policy forbids — so it simply would
        // not appear.
        globInclude: ['**/*.{vue,ts}', 'content/**/*.json'],
        globExclude: ['node_modules', 'dist', '.output', '.nuxt', '**/*.test.ts'],
      },
    },
  },
  css: cssList,
  components: componentsList,
  imports: { dirs: typesDirList },
  // The whole app is static: menus change once a week, when the skill writes a
  // new JSON and regenerates. Prerendering everything is what makes it readable
  // offline in a supermarket aisle.
  nitro: {
    prerender: { crawlLinks: true, routes: ['/', ...recipeRouteList()], failOnError: true },
  },
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
