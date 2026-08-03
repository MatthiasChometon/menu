import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://menu:menu@localhost:5433/menu_semaine_test';

// Set before the config is read: the globalSetup runs in this process, and
// @nestjs/config never overrides a variable already present in the environment.
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    root: './',
    // e2e files share one test database and each migrates it on boot, so they
    // must run one at a time to avoid racing on the schema.
    fileParallelism: false,
    include: ['**/*e2e.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
    globalSetup: ['./infrastructure/testing/e2e-database.ts'],
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
