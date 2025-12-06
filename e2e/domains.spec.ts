import { test, expect } from '@playwright/test';

test.describe('Domain Routing', () => {
    // Testing middleware rewrites is tricky purely from the client side without DNS entries
    // But we can check if the sub-path routing works as expected since the middleware rewrites to /brand

    test('should load brand page via direct path (simulation of rewrite)', async ({ page }) => {
        // Since we can't easily simulate "greenvalley.bakedbot.ai" causing the rewrite locally
        // without configuring /etc/hosts, we will verify that the TARGET route exists and works.
        // The middleware would rewrite "greenvalley.bakedbot.ai" -> "/greenvalley".

        await page.goto('/greenvalley');

        // Expect to see the Brand Page content
        await expect(page.locator('h1')).toContainText('Greenvalley');
        await expect(page.getByText('Welcome to our store')).toBeVisible();
        await expect(page.getByText('default public page')).toBeVisible();
    });

    test('should show chatbot on brand page', async ({ page }) => {
        await page.goto('/greenvalley');
        await expect(page.locator('button[aria-label="Toggle Chatbot"]')).toBeVisible();
    });
});
