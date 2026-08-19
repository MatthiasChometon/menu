import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.VISUAL_PORT) || 3778;

const BEHAVIOUR_ONLY = ['**/composer.e2e.test.ts', '**/linkPreview.e2e.test.ts'];

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*visual.test.ts', '**/*e2e.test.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  use: { baseURL: `http://localhost:${PORT}` },
  // Behaviour tests belong to one viewport. What the planner's solver does with a
  // day is the same at every width, and running its ten interactions three times
  // over only starves the shared preview server — which is what made them flaky.
  // Layout is the visual suite's job, and that one does run everywhere.
  projects: [
    {
      name: 'mobile',
      testIgnore: BEHAVIOUR_ONLY,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 670 } },
    },
    {
      name: 'tablet',
      testIgnore: BEHAVIOUR_ONLY,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  // Screenshots run against the real static output, not the dev server, so the
  // devtools overlay and HMR client cannot leak into a baseline.
  webServer: {
    command: 'pnpm preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT), NITRO_PORT: String(PORT) },
  },
});
