import { test, expect } from '@playwright/test';

test.describe('Customer Authentication Flow', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    test('should register a new customer', async ({ page }) => {
        await page.goto('/customer/register');

        // Fill registration form
        await page.fill('input[name="displayName"]', 'Test User');
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);
        await page.fill('input[name="confirmPassword"]', testPassword);

        // Accept terms
        await page.click('button[role="checkbox"]');

        // Submit
        await page.click('button[type="submit"]');

        // Expect redirect to profile
        await expect(page).toHaveURL(/\/customer\/profile/);
        await expect(page.locator('h1')).toContainText('My Account');
    });

    test('should login with existing customer', async ({ page }) => {
        await page.goto('/customer/login');

        // Fill login form
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);

        // Submit
        await page.click('button[type="submit"]');

        // Expect redirect to profile
        await expect(page).toHaveURL(/\/customer\/profile/);
    });

    test('should show validation errors on invalid input', async ({ page }) => {
        await page.goto('/customer/register');

        // Submit empty form
        await page.click('button[type="submit"]');

        // Check for error messages
        await expect(page.locator('text=Invalid email address')).toBeVisible();
        await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });
});
