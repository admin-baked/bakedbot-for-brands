import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

/**
 * Production E2E config — tests against live App Hosting.
 * No webServer — hits production directly.
 *
 * Projects:
 *   - public:      Unauthenticated public page tests
 *   - super:       Super Admin dashboard tests
 *   - dispensary:  Dispensary (Thrive Syracuse) dashboard tests
 *   - brand:       Brand (Ecstatic Edibles) dashboard tests
 */
export default defineConfig({
    testDir: '.',
    testMatch: ['generated/**/*.spec.ts', 'dashboard/**/*.spec.ts'],
    timeout: 45_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    retries: 0,
    reporter: [
        ['list'],
        ['json', { outputFile: join(__dirname, 'test-results', 'results.json') }],
    ],
    globalSetup: process.env.E2E_AUTH ? join(__dirname, 'auth', 'global-setup.ts') : undefined,
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        // Public pages — no auth needed
        {
            name: 'public',
            testMatch: 'generated/**/*.spec.ts',
            use: { ...devices['Desktop Chrome'] },
        },
        // Super Admin dashboard
        {
            name: 'super',
            testMatch: 'dashboard/super/**/*.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                storageState: join(__dirname, 'auth', '.auth', 'super.json'),
            },
        },
        // Dispensary dashboard (Thrive Syracuse)
        {
            name: 'dispensary',
            testMatch: 'dashboard/dispensary/**/*.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                storageState: join(__dirname, 'auth', '.auth', 'dispensary.json'),
            },
        },
        // Brand dashboard (Ecstatic Edibles)
        {
            name: 'brand',
            testMatch: 'dashboard/brand/**/*.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                storageState: join(__dirname, 'auth', '.auth', 'brand.json'),
            },
        },
    ],
});
