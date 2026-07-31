import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.VISUAL_PORT) || 3778;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.visual.test.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 670 } } },
    {
      name: 'tablet',
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
