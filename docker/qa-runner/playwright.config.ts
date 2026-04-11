import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Cloud Run QA runner.
 * Tests run against production — no local dev server.
 */
export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    retries: 1,
    reporter: [
        ['json', { outputFile: '/tmp/test-results.json' }],
        ['list'],
    ],
    use: {
        baseURL: process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // No webServer — we test against production directly
});
