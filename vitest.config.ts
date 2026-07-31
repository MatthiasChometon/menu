import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['domain/**/*.test.ts', 'infrastructure/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*visual.test.ts'],
    // The Nuxt test environment boots a full app; 10s is not enough on a loaded machine.
    hookTimeout: 60_000,
  },
});
