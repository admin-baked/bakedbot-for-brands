import { expect, test, type Page } from '@playwright/test';

test.describe('Brands Page E2E Tests', () => {
    test('should load the brands page successfully', async ({ page }) => {
        const response = await page.goto('/brands', { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
    });

    test('should display the main heading and description', async ({ page }) => {
        await page.goto('/brands', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'Cannabis Brands in Chicago' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Discover top-trending cannabis brands/i)).toBeVisible({ timeout: 10_000 });
    });

    test('should display a list of brand links', async ({ page }) => {
        await page.goto('/brands', { waitUntil: 'domcontentloaded' });
        const brandLinks = page.locator('a[href^="/brands/"]');
        await expect(brandLinks).toBeVisible({ timeout: 10_000 });

        const count = await brandLinks.count();
        expect(count).toBeGreaterThan(0);
    });

    test('brand links should navigate to the correct brand page', async ({ page }) => {
        await page.goto('/brands', { waitUntil: 'domcontentloaded' });
        const firstBrandLink = page.locator('a[href^="/brands/"]').first();
        const href = await firstBrandLink.getAttribute('href');

        expect(href).not.toBeNull();

        if (href) {
            await firstBrandLink.click();
            await page.waitForURL(`**${href}`);
            expect(page.url()).toContain(href);
        }
    });
});