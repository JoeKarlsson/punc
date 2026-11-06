import { defineConfig, devices } from '@playwright/test';

// Browser tests for the static site in site/. Builds it, serves site-dist/,
// and runs e2e/ against it:
// - chromium: the site on a desktop (e2e/site.spec.ts)
// - iphone, pixel: an iPhone in WebKit (Safari's engine) and a Pixel in
//   Chromium (e2e/phone.spec.ts)
// - visual-desktop, visual-phone: screenshot comparisons (e2e/visual.spec.ts),
//   run in Playwright's Linux image so they match CI; see npm run test:visual
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testMatch: 'site.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', testMatch: 'phone.spec.ts', use: { ...devices['iPhone 13'] } },
    { name: 'pixel', testMatch: 'phone.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'visual-desktop', testMatch: 'visual.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'visual-phone', testMatch: 'visual.spec.ts', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run site:serve',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
