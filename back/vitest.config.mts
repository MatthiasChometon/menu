import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['domain/**/*.test.ts', 'infrastructure/**/*.test.ts'],
    exclude: ['**/*e2e.test.ts'],
    // Explicit, never the default: a hung test fails fast and says so. Pure logic answers in
    // milliseconds, so five seconds is generous.
    testTimeout: 5000,
    hookTimeout: 10_000,
    benchmark: { include: ['{domain,infrastructure}/**/*.bench.ts'] },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
