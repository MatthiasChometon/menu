import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://menu:menu@localhost:5433/menu_test';

// Set before the config is read: the globalSetup runs in this process, and
// @nestjs/config never overrides a variable already present in the environment.
process.env.DATABASE_URL = TEST_DATABASE_URL;

// The suite must not depend on the developer's gitignored .env: these are the
// values the contract is written against, and they win over anything on disk.
const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'test-secret-not-used-anywhere-else',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  BACK_URL: 'http://localhost:3779',
  FRONT_URL: 'http://localhost:3777',
};

Object.assign(process.env, TEST_ENV);

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
    env: TEST_ENV,
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
