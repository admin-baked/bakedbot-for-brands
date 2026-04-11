import { expect, test, type Page } from '@playwright/test';

const BASE = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

/**
 * Helper: bypass the age gate by clicking "Yes, I'm 21 or older"
 */
async function bypassAgeGate(page: Page): Promise<void> {
    const ageGate = page.locator('[data-testid="age-gate"]');
    if (await ageGate.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await page.locator('[data-testid="age-confirm"]').click();
        await page.waitForURL(/(?!.*verify-age)/, { timeout: 10_000 });
    }
}

test.describe('Smokey Budtender Widget — Stress Test', () => {
    test.describe.configure({ timeout: 60_000 });

    test('homepage loads and age gate works', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await bypassAgeGate(page);
        await expect(page.locator('body')).not.toContainText('Age Verification Required');
    });

    test('budtender page loads after age gate', async ({ page }) => {
        await page.goto('/budtender', { waitUntil: 'domcontentloaded' });
        await bypassAgeGate(page);
        // After age gate, should be on /budtender
        await expect(page).toHaveURL(/budtender/, { timeout: 10_000 });
        await expect(page.locator('body')).toBeVisible();
    });

    test('pricing page loads after age gate', async ({ page }) => {
        await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
        await bypassAgeGate(page);
        await expect(page).toHaveURL(/pricing/, { timeout: 10_000 });
    });

    test('chatbot icon is visible on homepage', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await bypassAgeGate(page);
        // Chatbot FAB should be visible
        const chatButton = page.locator('button[aria-label="Toggle Chatbot"]');
        await expect(chatButton).toBeVisible({ timeout: 10_000 });
    });

    test('chatbot opens when clicked', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await bypassAgeGate(page);
        const chatButton = page.locator('button[aria-label="Toggle Chatbot"]');
        await chatButton.click();
        // Chat window should appear
        await expect(page.locator('[data-testid="chat-window"]')).toBeVisible({ timeout: 10_000 });
    });

    test('Thrive Syracuse tablet check-in loads', async ({ page }) => {
        await page.goto('/loyalty/tablet/org_thrive_syracuse', { waitUntil: 'domcontentloaded' });
        // Tablet flow should load (no age gate on tablet route)
        await expect(page.locator('body')).toBeVisible();
        // Should see some form of check-in UI
        const body = await page.locator('body').textContent();
        expect(body?.length).toBeGreaterThan(100);
    });

    test('blog loads without age gate', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded' });
        // Blog might not need age gate
        await expect(page.locator('body')).toBeVisible();
    });

    test('concurrent page loads stress test', async ({ browser }) => {
        // Open 5 pages simultaneously to stress test
        const pages = await Promise.all(
            Array.from({ length: 5 }, () => browser.newPage())
        );

        const routes = ['/', '/pricing', '/budtender', '/blog', '/brands'];

        const results = await Promise.allSettled(
            pages.map(async (page, i) => {
                const start = Date.now();
                await page.goto(routes[i], { waitUntil: 'domcontentloaded', timeout: 30_000 });
                const loadTime = Date.now() - start;
                await page.close();
                return { route: routes[i], loadTime, status: 'ok' };
            })
        );

        // All pages should load successfully
        for (const result of results) {
            expect(result.status).toBe('fulfilled');
            if (result.status === 'fulfilled') {
                expect(result.value.loadTime).toBeLessThan(15_000);
            }
        }
    });
});
