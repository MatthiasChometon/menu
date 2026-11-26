import { defineConfig } from 'vitest/config';

// The engine is pure — it takes a ShopClient and never touches the browser or the
// network — so its tests run in plain Node, no WXT test harness needed.
// The backoff helpers come from the front, whose tsconfig only references files
// Nuxt generates (absent on a fresh checkout): the transform must not look it up.
export default defineConfig({
  oxc: { tsconfig: false },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.output/**', '.wxt/**'],
    // Explicit, so a hung or slow test fails after a known time, not the library default.
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
