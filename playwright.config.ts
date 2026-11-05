import { defineConfig, devices } from '@playwright/test';

// Browser tests for the static site in site/. Builds it, serves site-dist/,
// and runs e2e/ against it in Chromium.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run site:serve',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
