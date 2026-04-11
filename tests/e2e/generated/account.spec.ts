import { expect, test, type Page } from '@playwright/test';

test.describe('Account Page E2E Tests', () => {
    test('should load the account page successfully', async ({ page }) => {
        await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(await page.locator('h1:has-text("Account Settings")').isVisible()).toBeTruthy();
    });

    test('should display the profile view by default', async ({ page }) => {
        await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'First Name' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('textbox', { name: 'Last Name' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 10_000 });
    });

    test('should navigate to the subscription view', async ({ page }) => {
        await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByRole('tab', { name: 'Subscription' }).click();
        await expect(page.getByText('Subscription Details')).toBeVisible({ timeout: 10_000 });
    });

    test('should navigate to the integrations view', async ({ page }) => {
        await page.goto('/account', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByRole('tab', { name: 'Integrations' }).click();
        await expect(page.getByText('Connect to your favorite platforms')).toBeVisible({ timeout: 10_000 });
    });
});