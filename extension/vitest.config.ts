import { defineConfig } from 'vitest/config';

// The slot windows are read in the shop's wall-clock time (France), so the suite
// pins the zone: left to the machine, a UTC runner (CI) read 09:00+02:00 as
// 07:00 and the slot tests failed there while passing on a Paris laptop.
process.env.TZ = 'Europe/Paris';

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
