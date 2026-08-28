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
  // The photographs are imported by a glob so the app knows which ones exist,
  // which also makes all 144 of them dependencies of the bundle — and Nuxt then
  // emits a <link rel="prefetch" as="image"> for every single one. Measured on
  // the deployed site: four images at first paint, then 149 and 8.2 MB a second
  // and a half later, to show one thumbnail. loading="lazy" cannot help, since
  // it governs <img> and not a prefetch hint.
  //
  // Dropping them from the manifest drops the hints. Nothing else changes: the
  // URLs the app uses come from the imported modules, and each photo still
  // arrives when a card scrolls into view.
  hooks: {
    'build:manifest': (manifest): void => {
      for (const entry of Object.values(manifest)) {
        entry.assets = entry.assets?.filter((asset): boolean => !asset.endsWith('.webp'));
      }
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
      name: 'Le Menu',
      short_name: 'Le Menu',
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
      // A new build takes over at once rather than waiting for every tab to
      // close: the worker skips waiting and claims the open pages, and with
      // registerType 'autoUpdate' the client then reloads them onto the fresh
      // version. Without this a deploy stayed invisible until a hard reload.
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // Concatenated into the generated worker, which is the only way to teach
      // a generateSW build to receive a push.
      importScripts: ['/push-sw.js'],
      // Everything is prerendered, so the whole app can be precached: the
      // shopping list stays readable with no signal in the shop.
      //
      // Photographs are the exception. Ninety-six dish pictures are eight of the
      // fifteen megabytes an install used to cost, and downloading them all at
      // once saturated the connection — the first visit spent twenty seconds
      // fetching pictures nobody had asked to see. They are cached as they are
      // looked at instead, so a dish opened once stays available with no signal.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: ({ request }: { request: Request }): boolean =>
            request.destination === 'image',
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'menu-images',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
            // Photographs live cross-origin on images.menu.mtxlab.xyz, which sends
            // CORS headers. Cache only a real 200 — never an opaque (status 0)
            // response, which the worker cannot hand back to a cors-mode <img>
            // request without failing it as a network error.
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
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
