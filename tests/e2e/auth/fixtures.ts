/**
 * Auth-aware Playwright Test Fixtures
 *
 * Provides pre-authenticated browser contexts for each org type.
 * Tests import from here instead of '@playwright/test' to get auth built-in.
 *
 * Usage:
 *   import { test, expect } from '../auth/fixtures';
 *
 *   test('dashboard loads for dispensary', async ({ dispensaryPage }) => {
 *       await dispensaryPage.goto('/dashboard');
 *       await expect(dispensaryPage.locator('h1')).toBeVisible();
 *   });
 */

import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const AUTH_DIR = join(__dirname, '.auth');

type AuthFixtures = {
    superPage: Page;
    dispensaryPage: Page;
    brandPage: Page;
    superContext: BrowserContext;
    dispensaryContext: BrowserContext;
    brandContext: BrowserContext;
};

function hasValidSession(storageFile: string): boolean {
    const path = join(AUTH_DIR, storageFile);
    if (!existsSync(path)) return false;
    try {
        const state = JSON.parse(readFileSync(path, 'utf-8'));
        return state.cookies?.length > 0;
    } catch {
        return false;
    }
}

export const test = base.extend<AuthFixtures>({
    superContext: async ({ browser }, use) => {
        const storagePath = join(AUTH_DIR, 'super.json');
        if (!hasValidSession('super.json')) {
            test.skip(true, 'Super user auth not available — run global-setup first');
        }
        const context = await browser.newContext({ storageState: storagePath });
        await use(context);
        await context.close();
    },

    dispensaryContext: async ({ browser }, use) => {
        const storagePath = join(AUTH_DIR, 'dispensary.json');
        if (!hasValidSession('dispensary.json')) {
            test.skip(true, 'Dispensary auth not available — run global-setup first');
        }
        const context = await browser.newContext({ storageState: storagePath });
        await use(context);
        await context.close();
    },

    brandContext: async ({ browser }, use) => {
        const storagePath = join(AUTH_DIR, 'brand.json');
        if (!hasValidSession('brand.json')) {
            test.skip(true, 'Brand auth not available — run global-setup first');
        }
        const context = await browser.newContext({ storageState: storagePath });
        await use(context);
        await context.close();
    },

    superPage: async ({ superContext }, use) => {
        const page = await superContext.newPage();
        await use(page);
        await page.close();
    },

    dispensaryPage: async ({ dispensaryContext }, use) => {
        const page = await dispensaryContext.newPage();
        await use(page);
        await page.close();
    },

    brandPage: async ({ brandContext }, use) => {
        const page = await brandContext.newPage();
        await use(page);
        await page.close();
    },
});

export { expect };

/**
 * Helper: bypass age gate by setting cookie directly
 */
export async function bypassAgeGate(context: BrowserContext, baseURL: string) {
    await context.addCookies([{
        name: 'age_verified',
        value: 'true',
        url: baseURL,
    }]);
}
