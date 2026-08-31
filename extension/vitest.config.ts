import { defineConfig } from 'vitest/config';

// The engine is pure — it takes a ShopClient and never touches the browser or the
// network — so its tests run in plain Node, no WXT test harness needed.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.output/**', '.wxt/**'],
  },
});
