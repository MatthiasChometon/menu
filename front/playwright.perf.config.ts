import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PERF_PORT) || 3781;

// The timing suite, apart from the behaviour and visual ones: it needs a quiet machine,
// so one worker and one test at a time. It runs against the generated site served as
// deployed (`pnpm generate` first). A failed test is retried once and no more: a timing
// that fails twice is real.
export default defineConfig({
  testDir: 'infrastructure/performance',
  testMatch: ['**/*.perf.test.ts'],
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // An action that cannot happen fails in seconds with its call log, instead of
  // waiting for the whole test to time out.
  use: { baseURL: `http://localhost:${PORT}`, actionTimeout: 10_000 },
  webServer: {
    command: 'pnpm preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT), NITRO_PORT: String(PORT), NITRO_PRESET: 'static' },
  },
});
