import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Run Playwright specs from both legacy e2e/ and new tests/e2e/ folders
  testDir: '.',
  testMatch: [
    'e2e/**/*.spec.ts',
    'tests/e2e/**/*.spec.ts',
  ],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? [['html'], ['json', { outputFile: 'test-results/results.json' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for multi-browser testing in CI
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
