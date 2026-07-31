export default defineNuxtConfig({
  // The week view is the entry point: fully prerendered so it opens instantly
  // and stays readable offline.
  routeRules: { '/': { prerender: true } },
});
