import { defineVitestConfig } from '@nuxt/test-utils/config';

// Read when the Nuxt test environment builds its config, so it has to be set
// before that: an absolute base URL sends every call out of the test server,
// where registerEndpoint cannot answer it and the component under test hangs
// on a request nobody will ever reply to.
process.env.NUXT_PUBLIC_API_BASE = '';

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['domain/**/*.test.ts', 'infrastructure/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*visual.test.ts', '**/*e2e.test.ts'],
    // The Nuxt test environment boots a full app; 10s is not enough on a loaded machine.
    hookTimeout: 60_000,
    // Same reasoning for individual tests: mountSuspended/renderSuspended can pass
    // 5s once several Suspense-mounted component tests run in parallel workers.
    testTimeout: 20_000,
  },
});
