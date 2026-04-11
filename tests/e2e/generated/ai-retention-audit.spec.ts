import { expect, test, type Page } from '@playwright/test';

test.describe('AI Retention Audit Page', () => {
    test('page loads successfully', async ({ page }) => {
        const response = await page.goto('/ai-retention-audit', { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
    });

    test('displays key elements', async ({ page }) => {
        await page.goto('/ai-retention-audit', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('heading', { name: 'AI Retention Audit' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('Analyze your site for customer capture gaps')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByPlaceholder('https://')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'Run Audit' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: 'BakedBot AI' })).toBeVisible({ timeout: 10_000 });
    });

    test('form submission and link navigation', async ({ page }) => {
        await page.goto('/ai-retention-audit', { waitUntil: 'domcontentloaded' });

        await page.getByPlaceholder('https://').fill('https://example.com');
        // No assertions on the audit results since it would require mocking
        // Just assert that the button is clickable.
        await page.getByRole('button', { name: 'Run Audit' }).click();

        // Check that the BakedBot AI link navigates to the homepage
        await page.getByRole('link', { name: 'BakedBot AI' }).click();
        await expect(page).toHaveURL('http://localhost:3000/'); // Adjust if your local dev server is different
    });
});