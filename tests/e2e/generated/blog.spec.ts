import { expect, test, type Page } from '@playwright/test';

test.describe('Blog Page E2E Tests', () => {
    test('should load the blog page successfully', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(await page.locator('h1:has-text("The BakedBot Blog")').isVisible()).toBeTruthy();
    });

    test('should display blog categories', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(await page.getByText('All').isVisible({ timeout: 10_000 })).toBeTruthy();
        expect(await page.getByRole('link', { name: 'All' }).isVisible({ timeout: 10_000 })).toBeTruthy();
    });

    test('should navigate to a category page', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        const categoryLink = page.getByRole('link').filter({ hasText: 'All' }).first();
        await categoryLink.click();
        await page.waitForURL('**/blog');
    });

    test('should display blog signup CTA', async ({ page }) => {
        await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(await page.getByText('Stay up-to-date').isVisible({ timeout: 10_000 })).toBeTruthy();
    });
});