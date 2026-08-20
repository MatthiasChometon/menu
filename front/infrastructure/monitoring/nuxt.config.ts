import { sentryVitePlugin } from '@sentry/vite-plugin';

// Wired the way matthias-cv is, which is the montage that has been running in
// production the longest. Its own layer, like every other technical concern.
export default defineNuxtConfig({
  // Generated only when there is a token to upload them with. The plugin below
  // deletes them from the output after the upload, so a stack trace is readable
  // in Sentry and nowhere else — but with no token there is no upload and so no
  // deletion, and the maps would ship with the site. Better none at all than
  // the source of the whole app served to anybody who asks.
  sourcemap: { client: (process.env.SENTRY_AUTH_TOKEN ?? '') !== '' ? 'hidden' : false },
  runtimeConfig: {
    public: {
      sentry: {
        // Written here rather than left to a build variable. A DSN is public by
        // construction — it ships in the bundle of every deployed page and only
        // allows writing events into that one project — so keeping it in the
        // build configuration hides nothing, while a variable makes reporting
        // depend on the environment whoever ran the build happened to have.
        dsn:
          process.env.NUXT_PUBLIC_SENTRY_DSN ??
          'https://d62e03f01f829f7e30acc5b892048859@o4511738521845760.ingest.de.sentry.io/4511943243595856',
      },
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@sentry/vue'],
    },
    plugins: [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        // The app reports errors and nothing else, so the tracing and replay
        // machinery is dead weight in a bundle a phone downloads in a shop.
        bundleSizeOptimizations: {
          excludeTracing: true,
          excludeReplayIframe: true,
          excludeReplayShadowDom: true,
          excludeReplayWorker: true,
          excludeDebugStatements: true,
        },
        sourcemaps: {
          disable: false,
          filesToDeleteAfterUpload: [
            '.*/**/public/**/*.map',
            '.*/**/server/**/*.map',
            '.*/**/output/**/*.map',
            '.*/**/function/**/*.map',
          ],
        },
      }),
    ],
  },
});
