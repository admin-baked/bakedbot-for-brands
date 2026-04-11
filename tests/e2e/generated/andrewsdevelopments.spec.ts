import { expect, test, type Page } from '@playwright/test';

test.describe('AndrewsDevelopments Page E2E Tests', () => {
    test('should redirect to the WordPress Cloud Run service', async ({ page }) => {
        await page.goto('/andrewsdevelopments', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForURL('https://andrews-wp-lo74oftdza-uc.a.run.app/', { timeout: 10_000 });
        expect(page.url()).toBe('https://andrews-wp-lo74oftdza-uc.a.run.app/');
    });
});