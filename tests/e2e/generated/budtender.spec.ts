import { expect, test, type Page } from '@playwright/test';

test.describe('Budtender Landing Page E2E', () => {
    test('page loads successfully', async ({ page }) => {
        await page.goto('/budtender', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(await page.locator('h1').textContent()).toContain('Cannabis Pros');
    });

    test('hero section elements are visible', async ({ page }) => {
        await page.goto('/budtender', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('heading', { name: /Operating System for Cannabis Pros/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Supercharge your product knowledge/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /Create Free Account/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /Try the Demo/i })).toBeVisible({ timeout: 10_000 });
    });

    test('navigation to create account page', async ({ page }) => {
        await page.goto('/budtender', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByRole('link', { name: /Create Free Account/i }).click();
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('navigation to demo page', async ({ page }) => {
        await page.goto('/budtender', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByRole('link', { name: /Try the Demo/i }).click();
        await expect(page).toHaveURL(/.*\/demo/);
    });
});